import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { dayRangeEAT } from "./dates";
import { SaleError } from "./sales";
import type { z } from "zod";
import type { listInventorySchema, listMovementsSchema, StockActionInput } from "./validation/inventory";

type Tx = Prisma.TransactionClient;

export type StockStatus = "IN_STOCK" | "LOW" | "OUT";
export function stockStatus(stockQty: number, minStock: number): StockStatus {
  if (stockQty <= 0) return "OUT";
  if (stockQty <= minStock) return "LOW";
  return "IN_STOCK";
}

export class InventoryError extends SaleError {}

/**
 * Applies a stock action atomically inside the caller's transaction and records a StockMovement
 * (with quantity before/after). Every branch is a single UPDATE … RETURNING on the product row,
 * so concurrent sales / adjustments serialise on the row lock and can never lose an update or
 * drive stock negative.
 */
export async function applyStockAction(
  tx: Tx,
  input: StockActionInput,
  userId: string,
  opts: { allowNoop?: boolean; reasonOverride?: string } = {},
) {
  const { productId } = input;
  let before: number;
  let after: number;
  let type: "ADDITION" | "REDUCTION" | "ADJUSTMENT";
  let reason: string | null = opts.reasonOverride ?? input.reason ?? null;

  if (input.action === "ADD") {
    type = "ADDITION";
    const rows = await tx.$queryRaw<{ stockQty: number }[]>`
      UPDATE "Product" SET "stockQty" = "stockQty" + ${input.qty}, "updatedAt" = now()
       WHERE id = ${productId} RETURNING "stockQty"`;
    if (!rows.length) throw new InventoryError("Product not found", 404, undefined, "PRODUCT_NOT_FOUND");
    after = rows[0].stockQty;
    before = after - input.qty;
    const parts = [] as string[];
    if (input.reason) parts.push(input.reason);
    else parts.push("Stock received");
    if (input.unitCost !== undefined) parts.push(`unit cost UGX ${input.unitCost.toLocaleString("en-US")}`);
    reason = opts.reasonOverride ?? parts.join(" – ");
    if (input.updateBuyingCost && input.unitCost !== undefined) {
      await tx.product.update({ where: { id: productId }, data: { buyingCost: input.unitCost } });
    }
  } else if (input.action === "REDUCE") {
    type = "REDUCTION";
    const rows = await tx.$queryRaw<{ stockQty: number }[]>`
      UPDATE "Product" SET "stockQty" = "stockQty" - ${input.qty}, "updatedAt" = now()
       WHERE id = ${productId} AND "stockQty" >= ${input.qty} RETURNING "stockQty"`;
    if (!rows.length) {
      const p = await tx.product.findUnique({ where: { id: productId }, select: { name: true, stockQty: true } });
      if (!p) throw new InventoryError("Product not found", 404, undefined, "PRODUCT_NOT_FOUND");
      throw new InventoryError(
        `Cannot remove ${input.qty} – only ${p.stockQty} of "${p.name}" in stock`,
        409,
        { qty: [`Only ${p.stockQty} in stock`] },
        "INSUFFICIENT_STOCK",
      );
    }
    after = rows[0].stockQty;
    before = after + input.qty;
  } else {
    type = "ADJUSTMENT";
    // lock the row, remember the old value, set the counted value – one statement
    const rows = await tx.$queryRaw<{ before: number; after: number }[]>`
      UPDATE "Product" p SET "stockQty" = ${input.countedQty}, "updatedAt" = now()
        FROM (SELECT id, "stockQty" FROM "Product" WHERE id = ${productId} FOR UPDATE) o
       WHERE p.id = o.id
      RETURNING o."stockQty" AS before, p."stockQty" AS after`;
    if (!rows.length) throw new InventoryError("Product not found", 404, undefined, "PRODUCT_NOT_FOUND");
    before = rows[0].before;
    after = rows[0].after;
    if (before === after) {
      if (opts.allowNoop) return null;
      throw new InventoryError(
        `Counted quantity (${after}) equals the current stock – nothing to adjust`,
        409,
        { countedQty: ["Same as the current stock"] },
        "NO_CHANGE",
      );
    }
  }

  return tx.stockMovement.create({
    data: { productId, type, qty: after - before, qtyBefore: before, qtyAfter: after, reason, userId },
    include: { product: { select: { id: true, name: true, sku: true, stockQty: true } } },
  });
}

export async function runStockAction(input: StockActionInput, userId: string) {
  return prisma.$transaction((tx) => applyStockAction(tx, input, userId), { timeout: 15_000 });
}

// ---------- queries ----------

export async function getInventorySummary() {
  const [r] = await prisma.$queryRaw<
    { total: bigint; low: bigint; out: bigint; cost: bigint; retail: bigint }[]
  >`SELECT count(*) AS total,
           count(*) FILTER (WHERE "stockQty" > 0 AND "stockQty" <= "minStock") AS low,
           count(*) FILTER (WHERE "stockQty" <= 0) AS out,
           COALESCE(sum("stockQty"::bigint * "buyingCost"), 0) AS cost,
           COALESCE(sum("stockQty"::bigint * "sellingPrice"), 0) AS retail
      FROM "Product" WHERE active = true`;
  return {
    totalProducts: Number(r.total),
    lowStock: Number(r.low),
    outOfStock: Number(r.out),
    inventoryValue: Number(r.cost),
    retailValue: Number(r.retail),
  };
}

/** Active products that are low or out, most urgent first (out of stock, then lowest ratio). */
export async function listAlerts(limit = 10) {
  const rows = await prisma.$queryRaw<{ id: string; sku: string; name: string; stockQty: number; minStock: number }[]>`
    SELECT id, sku, name, "stockQty", "minStock" FROM "Product"
     WHERE active = true AND "stockQty" <= "minStock"
     ORDER BY ("stockQty" > 0), "stockQty", name
     LIMIT ${limit}`;
  return rows;
}

type InventoryFilters = z.infer<typeof listInventorySchema>;

export async function listInventory(f: InventoryFilters) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { sku: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.status !== "all") {
    const ids =
      f.status === "out"
        ? await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "stockQty" <= 0`
        : await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "stockQty" > 0 AND "stockQty" <= "minStock"`;
    where.id = { in: ids.map((r) => r.id) };
  }
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
  ]);
  const items = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category.name,
    categoryId: p.categoryId,
    stockQty: p.stockQty,
    minStock: p.minStock,
    buyingCost: p.buyingCost,
    sellingPrice: p.sellingPrice,
    stockValue: p.stockQty * p.buyingCost,
    status: stockStatus(p.stockQty, p.minStock),
  }));
  return { items, total, page: f.page, pageSize: f.pageSize, pages: Math.max(1, Math.ceil(total / f.pageSize)) };
}

type MovementFilters = z.infer<typeof listMovementsSchema>;

export async function listMovements(f: MovementFilters) {
  const where: Prisma.StockMovementWhereInput = {};
  if (f.productId) where.productId = f.productId;
  if (f.type) where.type = f.type;
  if (f.userId) where.userId = f.userId;
  const range = dayRangeEAT(f.from, f.to);
  if (range) where.createdAt = range;
  const [total, movements] = await Promise.all([
    prisma.stockMovement.count({ where }),
    prisma.stockMovement.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        user: { select: { id: true, name: true } },
        sale: { select: { id: true, receiptNo: true } },
      },
    }),
  ]);
  return { movements, total, page: f.page, pageSize: f.pageSize, pages: Math.max(1, Math.ceil(total / f.pageSize)) };
}
