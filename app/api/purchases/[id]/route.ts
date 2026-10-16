import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { purchaseOrderActionSchema } from "@/lib/validation/inventory";

class PurchaseOrderError extends Error {}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, purchaseOrderActionSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!order) return { error: errorResponse("Purchase order not found", 404) } as const;

      let nextStatus: "ORDERED" | "CANCELLED" | "RECEIVED";
      if (parsed.data.action === "ORDER") {
        if (order.status !== "DRAFT") return { error: errorResponse("Only draft orders can be marked ordered", 409) } as const;
        nextStatus = "ORDERED";
      } else if (parsed.data.action === "CANCEL") {
        if (order.status !== "DRAFT" && order.status !== "ORDERED") return { error: errorResponse("This purchase order can no longer be cancelled", 409) } as const;
        nextStatus = "CANCELLED";
      } else {
        if (order.status !== "ORDERED") return { error: errorResponse("Only ordered purchases can be received", 409) } as const;
        nextStatus = "RECEIVED";
      }

      const data = nextStatus === "RECEIVED" && parsed.data.action === "RECEIVE"
        ? {
            status: nextStatus,
            receivedAt: new Date(),
            invoiceNumber: parsed.data.invoiceNumber,
            invoiceDate: new Date(`${parsed.data.invoiceDate}T00:00:00.000Z`),
            invoiceAmount: parsed.data.invoiceAmount,
          }
        : { status: nextStatus };
      const changed = await tx.purchaseOrder.updateMany({ where: { id, status: order.status }, data });
      if (changed.count !== 1) return { error: errorResponse("Purchase order status changed; refresh and try again", 409) } as const;

      if (nextStatus === "RECEIVED") {
        for (const item of order.items) {
          const rows = await tx.$queryRaw<{ stockQty: number }[]>`
            UPDATE "Product" SET "stockQty" = "stockQty" + ${item.qty}, "updatedAt" = now()
            WHERE id = ${item.productId} AND active = true RETURNING "stockQty"`;
          if (!rows.length) throw new PurchaseOrderError("A product in this order is no longer active; receipt was not applied");
          const after = rows[0].stockQty;
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: "ADDITION",
              qty: item.qty,
              qtyBefore: after - item.qty,
              qtyAfter: after,
              reason: `Received on ${order.poNumber}`,
              userId: auth.user.id,
              purchaseOrderId: order.id,
            },
          });
        }
      }
      return { order: await tx.purchaseOrder.findUnique({ where: { id }, include: { supplier: { select: { name: true } } } }) } as const;
    }, { timeout: 15_000 });
  } catch (error) {
    if (error instanceof PurchaseOrderError) return errorResponse(error.message, 409);
    throw error;
  }

  if ("error" in result) return result.error;
  return NextResponse.json({ order: result.order });
}
