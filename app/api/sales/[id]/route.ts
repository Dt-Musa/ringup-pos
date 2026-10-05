import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse } from "@/lib/api-utils";
import { saleDetailInclude } from "@/lib/sales-query";

// All roles; a cashier can only open their own sales (others look like 404). Includes items and refund history.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleDetailInclude });
  if (!sale || (auth.user.role === "CASHIER" && sale.cashierId !== auth.user.id)) return errorResponse("Sale not found", 404);
  return NextResponse.json({ sale });
}
