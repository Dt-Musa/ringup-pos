import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { createRefund, RefundError } from "@/lib/refunds";
import { createRefundSchema } from "@/lib/validation/refund";

// ADMIN / MANAGER only. Body: { saleId, fullRefund? | items: [{ saleItemId, qty, restock? }], reason, method? }
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, createRefundSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await createRefund(parsed.data, auth.user.id);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof RefundError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
    throw e;
  }
}
