import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public health/config check (exempt from the auth proxy). Returns only booleans, counts and
// generic status strings – never env var values or error details.
export async function GET() {
  const secret = process.env.SESSION_SECRET;
  const base = {
    hasSessionSecret: !!secret,
    sessionSecretLongEnough: !!secret && secret.length >= 32,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  };

  try {
    const [userCount, productCount] = await Promise.all([prisma.user.count(), prisma.product.count()]);
    const ok = base.sessionSecretLongEnough && base.hasDatabaseUrl;
    return NextResponse.json(
      { ok, db: "connected", userCount, productCount, ...base },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("[health] database check failed");
    return NextResponse.json(
      { ok: false, db: "error", userCount: null, productCount: null, ...base, message: "Database unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
