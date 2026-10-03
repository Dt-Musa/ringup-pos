import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// All roles; cashiers only see their own sales.
export async function GET() {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const sales = await prisma.sale.findMany({
    where: user.role === "CASHIER" ? { cashierId: user.id } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ sales });
}
