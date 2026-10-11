import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "./db";
import { hashPassword } from "./users";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const RATE_WINDOW_MINUTES = 15;
const EMAIL_LIMIT = 3;
const IP_LIMIT = 10;

export const GENERIC_RECOVERY_MESSAGE =
  "If an active account matches that email, we’ll send a password reset link shortly.";

export class RecoveryConfigurationError extends Error {}
export class RecoveryDeliveryError extends Error {}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getRecoveryConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const appUrl = process.env.APP_URL?.trim();
  if (!apiKey || !from || !appUrl) throw new RecoveryConfigurationError("Password recovery email configuration is incomplete");

  let origin: URL;
  try {
    origin = new URL(appUrl);
  } catch {
    throw new RecoveryConfigurationError("APP_URL is invalid");
  }
  if (origin.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && origin.hostname === "localhost")) {
    throw new RecoveryConfigurationError("APP_URL must use HTTPS in production");
  }
  origin.hash = "";
  origin.search = "";
  origin.pathname = origin.pathname.replace(/\/+$/, "") || "/";
  return { apiKey, from, origin };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function recoveryKey(scope: "email" | "ip", value: string) {
  return `${scope}:${hashValue(value)}`;
}

async function incrementRateLimit(keyHash: string) {
  const rows = await prisma.$queryRaw<{ requestCount: number }[]>`
    INSERT INTO "PasswordRecoveryRateLimit" ("keyHash", "windowStartedAt", "requestCount", "updatedAt")
    VALUES (${keyHash}, NOW(), 1, NOW())
    ON CONFLICT ("keyHash") DO UPDATE
    SET
      "requestCount" = CASE
        WHEN "PasswordRecoveryRateLimit"."windowStartedAt" <= NOW() - (${RATE_WINDOW_MINUTES} * INTERVAL '1 minute') THEN 1
        ELSE "PasswordRecoveryRateLimit"."requestCount" + 1
      END,
      "windowStartedAt" = CASE
        WHEN "PasswordRecoveryRateLimit"."windowStartedAt" <= NOW() - (${RATE_WINDOW_MINUTES} * INTERVAL '1 minute') THEN NOW()
        ELSE "PasswordRecoveryRateLimit"."windowStartedAt"
      END,
      "updatedAt" = NOW()
    RETURNING "requestCount"
  `;
  return rows[0]?.requestCount ?? Number.MAX_SAFE_INTEGER;
}

export async function isRecoveryRateLimited(email: string, ip: string) {
  const [emailCount, ipCount] = await Promise.all([
    incrementRateLimit(recoveryKey("email", email)),
    incrementRateLimit(recoveryKey("ip", ip)),
  ]);
  return emailCount > EMAIL_LIMIT || ipCount > IP_LIMIT;
}

function resetLink(origin: URL, token: string) {
  const url = new URL("/login/reset-password", origin);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendResetEmail(from: string, apiKey: string, email: string, name: string, link: string) {
  const resend = new Resend(apiKey);
  const safeName = escapeHtml(name);
  const result = await resend.emails.send({
    from,
    to: email,
    subject: "Reset your RingUp password",
    text: `Hello ${name},\n\nUse this link to reset your RingUp password. It expires in 30 minutes and can only be used once:\n${link}\n\nIf you did not request this, you can ignore this email.`,
    html: `<p>Hello ${safeName},</p><p>Use the link below to reset your RingUp password. It expires in 30 minutes and can only be used once.</p><p><a href="${link}">Reset your password</a></p><p>If you did not request this, you can ignore this email.</p>`,
  });
  if (result.error) throw new RecoveryDeliveryError("Reset email could not be sent");
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function requestPasswordReset(email: string, ip: string) {
  const { apiKey, from, origin } = getRecoveryConfig();
  if (await isRecoveryRateLimited(email, ip)) return { sent: false, rateLimited: true };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, active: true } });
  if (!user?.active) return { sent: false, rateLimited: false };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashValue(token);
  const created = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    return tx.passwordResetToken.create({
      data: { tokenHash, userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
      select: { id: true },
    });
  });

  try {
    await sendResetEmail(from, apiKey, user.email, user.name, resetLink(origin, token));
  } catch (error) {
    await prisma.passwordResetToken.deleteMany({ where: { id: created.id, usedAt: null } }).catch(() => {
      console.error("[password-recovery] could not revoke undelivered reset token");
    });
    throw error;
  }
  return { sent: true, rateLimited: false };
}

export async function consumePasswordReset(token: string, password: string) {
  const tokenHash = hashValue(token);
  const now = new Date();
  const passwordHash = await hashPassword(password);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true, userId: true } });
    if (!existing) return false;

    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: existing.id, usedAt: null, expiresAt: { gt: now }, user: { active: true } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return false;

    await tx.user.update({ where: { id: existing.userId, active: true }, data: { passwordHash, sessionVersion: { increment: 1 } } });
    await tx.passwordResetToken.updateMany({ where: { userId: existing.userId, usedAt: null }, data: { usedAt: now } });
    return true;
  });
}
