import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CreateSaleInput } from "./validation/sale";

export class SaleError extends Error {
  constructor(
    message: string,
    public status = 409,
    public fieldErrors?: Record<string, string[]>,
    public code?: string,
  ) {
    super(message);
  }
}

export function formatReceiptNo(n: number | bigint) {
  return `RU-${String(n).padStart(6, "0")}`;
}

export function computeDiscount(subtotal: number, d?: CreateSaleInput["discount"]) {
  if (!d || d.value === 0) return 0;
  if (d.type === "PERCENT") return Math.round((subtotal * d.value) / 100);
  return d.value;
}

export const saleInclude = {
  cashier: { select: { id: true, name: true } },
  items: { include: { product: { select: { name: true, sku: true } } }, orderBy: { id: "asc" } },
} satisfies Prisma.SaleInclude;

/**
 * Completes a sale in ONE transaction. Prices/costs come from the database row that is locked
 * and decremented atomically (UPDATE … WHERE stockQty >= qty RETURNING …) – never from the client.
 */
export async function createSale(input: CreateSaleInput, cashierId: string) {
  // merge duplicate lines, and process in a stable order to avoid deadlocks between concurrent sales
  const qtyById = new Map<string, number>();
  for (const it of input.items) qtyById.set(it.productId, (qtyById.get(it.productId) ?? 0) + it.qty);
  const lines = [...qtyById.entries()].sort(([a], [b]) => (a < b ? -1 : 1));

  return prisma.$transaction(
    async (tx) => {
      const priced: { productId: string; qty: number; unitPrice: number; unitCost: number; name: string }[] = [];

      for (const [productId, qty] of lines) {
        const rows = await tx.$queryRaw<{ id: string; name: string; sellingPrice: number; buyingCost: number }[]>`
          UPDATE "Product"
             SET "stockQty" = "stockQty" - ${qty}, "updatedAt" = now()
           WHERE id = ${productId} AND active = true AND "stockQty" >= ${qty}
          RETURNING id, name, "sellingPrice", "buyingCost"`;
        if (rows.length === 0) {
          const p = await tx.product.findUnique({ where: { id: productId }, select: { name: true, active: true, stockQty: true } });
          if (!p) throw new SaleError("A product in the cart no longer exists. Refresh and try again.", 404, undefined, "PRODUCT_NOT_FOUND");
          if (!p.active) throw new SaleError(`"${p.name}" is no longer available for sale`, 409, undefined, "PRODUCT_INACTIVE");
          throw new SaleError(
            `Not enough stock for "${p.name}" (available: ${p.stockQty}, requested: ${qty})`,
            409,
            undefined,
            "INSUFFICIENT_STOCK",
          );
        }
        const r = rows[0];
        priced.push({ productId, qty, unitPrice: Number(r.sellingPrice), unitCost: Number(r.buyingCost), name: r.name });
      }

      const subtotal = priced.reduce((s, l) => s + l.unitPrice * l.qty, 0);
      const discount = computeDiscount(subtotal, input.discount);
      if (discount > subtotal) {
        throw new SaleError("Discount cannot exceed the subtotal", 400, { "discount.value": ["Discount cannot exceed the subtotal"] }, "DISCOUNT_TOO_LARGE");
      }
      const total = subtotal - discount;

      let amountTendered: number | null = null;
      if (input.paymentMethod === "CASH") {
        if (input.amountTendered === undefined) {
          throw new SaleError("Enter the amount tendered for a cash sale", 400, { amountTendered: ["Enter the amount tendered"] });
        }
        if (input.amountTendered < total) {
          throw new SaleError("Amount tendered is less than the total", 400, { amountTendered: ["Amount tendered is less than the total"] });
        }
        amountTendered = input.amountTendered;
      }

      const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`SELECT nextval('receipt_no_seq') AS n`;
      const receiptNo = formatReceiptNo(n);

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          cashierId,
          status: "COMPLETED",
          subtotal,
          discount,
          total,
          paymentMethod: input.paymentMethod,
          amountTendered,
          paymentReference: input.paymentMethod === "CASH" ? null : input.paymentReference || null,
          notes: input.notes || null,
          items: {
            create: priced.map((l) => ({
              productId: l.productId,
              qty: l.qty,
              unitPrice: l.unitPrice,
              unitCost: l.unitCost,
              lineTotal: l.unitPrice * l.qty,
            })),
          },
        },
        include: saleInclude,
      });

      await tx.stockMovement.createMany({
        data: priced.map((l) => ({
          productId: l.productId,
          type: "SALE" as const,
          qty: -l.qty,
          reason: `Sale ${receiptNo}`,
          userId: cashierId,
          saleId: sale.id,
        })),
      });

      return { sale, change: amountTendered === null ? 0 : amountTendered - total };
    },
    { timeout: 15_000 },
  );
}
