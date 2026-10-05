import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/**
 * Net financials for sales created in [from, to] (both optional). This is the single place that "nets
 * refunds out" – dashboards and reports should use it instead of summing Sale.total directly.
 *
 *   revenue (net)  = Σ Sale.total  −  Σ Sale.refundedAmount          (voided sales excluded)
 *   COGS (net)     = Σ SaleItem.unitCost × qty  −  Σ unitCost × returned qty that was restocked
 *   profit         = revenue (net) − COGS (net)
 *
 * Returned goods that were NOT restocked (damaged) keep their cost, so the loss shows up in profit.
 */
export async function getFinancials(range?: { gte?: Date; lte?: Date }) {
  const salesWhere: Prisma.SaleWhereInput = { status: { not: "VOIDED" }, ...(range ? { createdAt: range } : {}) };
  const saleDate = Prisma.sql`s."createdAt" >= ${range?.gte ?? new Date(0)} AND s."createdAt" <= ${range?.lte ?? new Date("9999-01-01")}`;

  const [agg, cogsRows, recoveredRows] = await Promise.all([
    prisma.sale.aggregate({ where: salesWhere, _sum: { subtotal: true, discount: true, total: true, refundedAmount: true }, _count: true }),
    prisma.$queryRaw<{ v: bigint }[]>`
      SELECT COALESCE(SUM(si."unitCost"::bigint * si.qty), 0) AS v
        FROM "SaleItem" si JOIN "Sale" s ON s.id = si."saleId"
       WHERE s.status <> 'VOIDED' AND ${saleDate}`,
    prisma.$queryRaw<{ v: bigint }[]>`
      SELECT COALESCE(SUM(si."unitCost"::bigint * ri.qty), 0) AS v
        FROM "RefundItem" ri JOIN "SaleItem" si ON si.id = ri."saleItemId" JOIN "Sale" s ON s.id = si."saleId"
       WHERE ri.restock = true AND s.status <> 'VOIDED' AND ${saleDate}`,
  ]);

  const gross = agg._sum.total ?? 0;
  const refunds = agg._sum.refundedAmount ?? 0;
  const revenue = gross - refunds;
  const cogs = Number(cogsRows[0].v) - Number(recoveredRows[0].v);
  return { salesCount: agg._count, grossRevenue: gross, discounts: agg._sum.discount ?? 0, refunds, revenue, cogs, profit: revenue - cogs };
}
