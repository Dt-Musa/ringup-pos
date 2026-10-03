import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ADMIN / MANAGER only. Placeholder aggregate; full reports arrive in a later phase.
export async function GET() {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const agg = await prisma.sale.aggregate({
    where: { status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] } },
    _sum: { total: true },
    _count: true,
  });
  return NextResponse.json({ salesCount: agg._count, revenue: agg._sum.total ?? 0, currency: "UGX" });
}
