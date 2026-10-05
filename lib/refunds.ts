import "server-only";
import { prisma } from "./db";
import { SaleError } from "./sales";
import { allocate, refundAmount } from "./refund-math";
import type { CreateRefundInput } from "./validation/refund";

export class RefundError extends SaleError {}

/**
 * Refund / return in ONE transaction.
 *  - the sale row is locked (SELECT … FOR UPDATE) so concurrent refunds of the same sale are serialised and
 *    the remaining-refundable quantities are always re-read after the lock → no double refunds;
 *  - returned goods are restocked with an atomic UPDATE … RETURNING and a RETURN StockMovement (before/after);
 *  - Sale.refundedAmount and Sale.status are updated together with the Refund row.
 */
export async function createRefund(input: CreateRefundInput, userId: string) {
  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Sale" WHERE id = ${input.saleId} FOR UPDATE`;
      if (!locked.length) throw new RefundError("Sale not found", 404, undefined, "SALE_NOT_FOUND");

      const sale = await tx.sale.findUniqueOrThrow({
        where: { id: input.saleId },
        include: { items: { include: { product: { select: { name: true } }, refundItems: { select: { qty: true } } }, orderBy: { id: "asc" } } },
      });
      if (sale.status === "VOIDED") throw new RefundError("A voided sale cannot be refunded", 409, undefined, "SALE_VOIDED");

      const rows = sale.items.map((i) => {
        const refunded = i.refundItems.reduce((s, r) => s + r.qty, 0);
        return { item: i, refunded, remaining: i.qty - refunded };
      });
      if (rows.every((r) => r.remaining <= 0)) {
        throw new RefundError("This sale has already been fully refunded", 409, undefined, "ALREADY_REFUNDED");
      }

      // ---- decide which lines / quantities are being returned ----
      const lines: { saleItemId: string; qty: number; restock: boolean; unitPrice: number; productId: string }[] = [];
      if (input.fullRefund) {
        for (const r of rows) {
          if (r.remaining > 0) {
            lines.push({ saleItemId: r.item.id, qty: r.remaining, restock: input.restockAll ?? true, unitPrice: r.item.unitPrice, productId: r.item.productId });
          }
        }
      } else {
        const wanted = new Map<string, { qty: number; restock: boolean }>();
        for (const it of input.items ?? []) {
          const prev = wanted.get(it.saleItemId);
          wanted.set(it.saleItemId, { qty: (prev?.qty ?? 0) + it.qty, restock: it.restock ?? prev?.restock ?? true });
        }
        for (const [saleItemId, w] of wanted) {
          const r = rows.find((x) => x.item.id === saleItemId);
          if (!r) throw new RefundError("An item in the request does not belong to this sale", 400, { items: ["Invalid item for this sale"] }, "INVALID_ITEM");
          if (w.qty > r.remaining) {
            throw new RefundError(
              r.remaining === 0
                ? `"${r.item.product.name}" has already been fully refunded`
                : `Cannot refund ${w.qty} × "${r.item.product.name}" – only ${r.remaining} left to refund`,
              409,
              { items: [`Only ${r.remaining} left to refund for ${r.item.product.name}`] },
              "REFUND_EXCEEDS_REMAINING",
            );
          }
          lines.push({ saleItemId, qty: w.qty, restock: w.restock, unitPrice: r.item.unitPrice, productId: r.item.productId });
        }
      }

      // ---- money ----
      const grossBefore = rows.reduce((s, r) => s + r.refunded * r.item.unitPrice, 0);
      const grossLines = lines.map((l) => l.qty * l.unitPrice);
      const amount = refundAmount({
        subtotal: sale.subtotal,
        total: sale.total,
        grossBefore,
        grossAfter: grossBefore + grossLines.reduce((a, b) => a + b, 0),
        alreadyRefunded: sale.refundedAmount,
      });
      const shares = allocate(amount, grossLines);

      const refund = await tx.refund.create({
        data: {
          saleId: sale.id,
          userId,
          amount,
          reason: input.reason,
          method: input.method ?? null,
          items: { create: lines.map((l, i) => ({ saleItemId: l.saleItemId, qty: l.qty, restock: l.restock, amount: shares[i] })) },
        },
        include: { items: true },
      });

      // ---- restock (atomic) ----
      for (const l of lines.filter((x) => x.restock)) {
        const res = await tx.$queryRaw<{ stockQty: number }[]>`
          UPDATE "Product" SET "stockQty" = "stockQty" + ${l.qty}, "updatedAt" = now()
           WHERE id = ${l.productId} RETURNING "stockQty"`;
        const after = res[0].stockQty;
        await tx.stockMovement.create({
          data: {
            productId: l.productId,
            type: "RETURN",
            qty: l.qty,
            qtyBefore: after - l.qty,
            qtyAfter: after,
            reason: `Refund of ${sale.receiptNo}: ${input.reason}`.slice(0, 300),
            userId,
            saleId: sale.id,
          },
        });
      }

      // ---- sale status ----
      const fullyRefunded = rows.every((r) => {
        const now = lines.find((l) => l.saleItemId === r.item.id)?.qty ?? 0;
        return r.remaining - now <= 0;
      });
      await tx.sale.update({
        where: { id: sale.id },
        data: { refundedAmount: { increment: amount }, status: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });

      return { refund, saleStatus: fullyRefunded ? "REFUNDED" : "PARTIALLY_REFUNDED", receiptNo: sale.receiptNo };
    },
    { timeout: 20_000 },
  );
}
