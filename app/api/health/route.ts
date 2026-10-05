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
    // Probe the newest columns: catches a stale generated Prisma client (needs `prisma generate` + restart)
    // or migrations that have not been applied (`prisma migrate deploy`).
    let schema: "ok" | "mismatch" = "ok";
    try {
      await prisma.sale.aggregate({ _sum: { refundedAmount: true } });
      await prisma.stockMovement.findFirst({ select: { qtyAfter: true } });
    } catch {
      schema = "mismatch";
      console.error("[health] schema mismatch: run `prisma generate`, `prisma migrate deploy` and restart the server");
    }
    const ok = base.sessionSecretLongEnough && base.hasDatabaseUrl && schema === "ok";
    return NextResponse.json(
      { ok, db: "connected", schema, userCount, productCount, ...base },
      { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("[health] database check failed");
    return NextResponse.json(
      { ok: false, db: "error", schema: "unknown", userCount: null, productCount: null, ...base, message: "Database unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
