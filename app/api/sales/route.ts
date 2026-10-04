import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, parseJson, validate } from "@/lib/api-utils";
import { createSale, SaleError } from "@/lib/sales";
import { createSaleSchema, listSalesSchema } from "@/lib/validation/sale";

// GET: all roles; cashiers only see their own sales.
export async function GET(request: Request) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const parsed = validate(listSalesSchema, Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.ok) return parsed.response;
  const { page, pageSize } = parsed.data;
  const where = auth.user.role === "CASHIER" ? { cashierId: auth.user.id } : {};
  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { cashier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    }),
  ]);
  return NextResponse.json({ sales, total, page, pageSize });
}

// POST: all roles. Prices, costs, totals and stock are all decided server-side.
export async function POST(request: Request) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, createSaleSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const { sale, change } = await createSale(parsed.data, auth.user.id);
    return NextResponse.json({ sale, change }, { status: 201 });
  } catch (e) {
    if (e instanceof SaleError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
    throw e;
  }
}
