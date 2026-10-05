import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson, validate } from "@/lib/api-utils";
import { createSale, SaleError } from "@/lib/sales";
import { listSales } from "@/lib/sales-query";
import { createSaleSchema } from "@/lib/validation/sale";
import { listSalesSchema } from "@/lib/validation/refund";

// GET: all roles; cashiers only see their own sales. Filters: q (receipt no), from/to (YYYY-MM-DD, East Africa
// time), cashierId (staff only), paymentMethod, status. Returns totals for the whole filtered set.
export async function GET(request: Request) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const parsed = validate(listSalesSchema, Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(await listSales(parsed.data, auth.user));
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
