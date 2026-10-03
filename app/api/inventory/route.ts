import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ADMIN / MANAGER only. Lists stock levels; stock movements arrive in a later phase.
export async function GET() {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const items = await prisma.product.findMany({
    select: { id: true, sku: true, name: true, stockQty: true, minStock: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ items });
}
