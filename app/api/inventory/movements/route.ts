import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson, validate } from "@/lib/api-utils";
import { InventoryError, listMovements, runStockAction } from "@/lib/inventory";
import { listMovementsSchema, stockActionSchema } from "@/lib/validation/inventory";

// ADMIN / MANAGER – stock history, filterable by product, type, user and date range (YYYY-MM-DD).
export async function GET(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = validate(listMovementsSchema, Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(await listMovements(parsed.data));
}

// ADMIN / MANAGER – body: { action: "ADD"|"REDUCE"|"ADJUST", productId, qty | countedQty, reason, … }
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, stockActionSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const movement = await runStockAction(parsed.data, auth.user.id);
    return NextResponse.json({ movement }, { status: 201 });
  } catch (e) {
    if (e instanceof InventoryError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
    throw e;
  }
}
