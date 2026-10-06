import "server-only";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { prisma } from "./db";
import { rangeInstants, type LocalRange } from "./dates";

/**
 * Net-of-refunds financials. This module is the ONLY place that sums money for dashboards, reports and
 * exports – never sum Sale.total directly elsewhere.
 *
 *   gross revenue  = Σ Sale.total                       (after the sale's discount; VOIDED sales excluded)
 *   refunds        = Σ Sale.refundedAmount
 *   revenue (net)  = gross − refunds
 *   COGS (net)     = Σ SaleItem.unitCost × qty  −  Σ unitCost × returned qty that was restocked
 *   profit         = revenue (net) − COGS (net);   margin = profit / revenue
 *
 * Refunds are attributed to the ORIGINAL sale's date (Sale.refundedAmount), so a period's figures change if a
 * sale from that period is refunded later. Returned goods that were NOT restocked keep their cost (a loss).
 * All grouping by day/week/month uses local time in Africa/Kampala.
 */

export const TZ_NAME = "Africa/Kampala";

export type Scope = { range?: { gte?: Date; lte?: Date }; cashierId?: string };

export type Metrics = {
  salesCount: number;
  subtotal: number; // before discounts
  discounts: number;
  grossRevenue: number; // after discounts, before refunds
  refunds: number;
  revenue: number; // net
  cogs: number;
  profit: number;
  margin: number | null; // profit / revenue, null when there is no revenue
};

function saleFilter(scope: Scope) {
  const parts: Prisma.Sql[] = [Prisma.sql`s.status <> 'VOIDED'`];
  if (scope.range?.gte) parts.push(Prisma.sql`s."createdAt" >= ${scope.range.gte}`);
  if (scope.range?.lte) parts.push(Prisma.sql`s."createdAt" <= ${scope.range.lte}`);
  if (scope.cashierId) parts.push(Prisma.sql`s."cashierId" = ${scope.cashierId}`);
  return Prisma.join(parts, " AND ");
}

/** CTE "x": one row per sale in scope, with its local timestamp and net COGS. */
function salesCte(scope: Scope) {
  return Prisma.sql`
    WITH s AS (
      SELECT s.id, s."cashierId", s."paymentMethod", s.subtotal, s.discount, s.total, s."refundedAmount",
             ((s."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${TZ_NAME}) AS local
        FROM "Sale" s
       WHERE ${saleFilter(scope)}
    ),
    cost AS (
      SELECT si."saleId", SUM(si."unitCost"::bigint * si.qty) AS v
        FROM "SaleItem" si JOIN s ON s.id = si."saleId"
       GROUP BY si."saleId"
    ),
    recovered AS (
      SELECT si."saleId", SUM(si."unitCost"::bigint * ri.qty) AS v
        FROM "RefundItem" ri
        JOIN "SaleItem" si ON si.id = ri."saleItemId"
        JOIN s ON s.id = si."saleId"
       WHERE ri.restock = true
       GROUP BY si."saleId"
    ),
    x AS (
      SELECT s.*, COALESCE(cost.v, 0) - COALESCE(recovered.v, 0) AS cogs
        FROM s
        LEFT JOIN cost ON cost."saleId" = s.id
        LEFT JOIN recovered ON recovered."saleId" = s.id
    )`;
}

const METRIC_COLS = Prisma.sql`
  count(*)::bigint AS n,
  COALESCE(SUM(subtotal), 0)::bigint AS subtotal,
  COALESCE(SUM(discount), 0)::bigint AS discounts,
  COALESCE(SUM(total), 0)::bigint AS gross,
  COALESCE(SUM("refundedAmount"), 0)::bigint AS refunds,
  COALESCE(SUM(cogs), 0)::bigint AS cogs`;

type RawMetrics = { n: bigint | null; subtotal: bigint | null; discounts: bigint | null; gross: bigint | null; refunds: bigint | null; cogs: bigint | null };

function toMetrics(r?: Partial<RawMetrics>): Metrics {
  const n = (v?: bigint | null) => Number(v ?? 0);
  const grossRevenue = n(r?.gross);
  const refunds = n(r?.refunds);
  const revenue = grossRevenue - refunds;
  const cogs = n(r?.cogs);
  const profit = revenue - cogs;
  return {
    salesCount: n(r?.n),
    subtotal: n(r?.subtotal),
    discounts: n(r?.discounts),
    grossRevenue,
    refunds,
    revenue,
    cogs,
    profit,
    margin: revenue > 0 ? profit / revenue : null,
  };
}

/** Totals for all (non-voided) sales in scope. Correct (all zeros) when there are no sales. */
export async function getFinancials(range?: { gte?: Date; lte?: Date }, opts: { cashierId?: string } = {}): Promise<Metrics> {
  const rows = await prisma.$queryRaw<RawMetrics[]>`${salesCte({ range, ...opts })} SELECT ${METRIC_COLS} FROM x`;
  return toMetrics(rows[0]);
}

export type Grain = "day" | "week" | "month";
export type PeriodRow = Metrics & { period: string }; // period = first local day of the bucket, YYYY-MM-DD

/** One row per day/week/month bucket in the local range – empty buckets included (zeros). */
export async function salesByPeriod(range: LocalRange, grain: Grain, opts: { cashierId?: string } = {}): Promise<PeriodRow[]> {
  const step = `1 ${grain}`;
  const rows = await prisma.$queryRaw<(RawMetrics & { period: string })[]>`
    ${salesCte({ range: rangeInstants(range), ...opts })},
    agg AS (SELECT date_trunc(${grain}, local)::date AS p, ${METRIC_COLS} FROM x GROUP BY 1)
    SELECT to_char(g, 'YYYY-MM-DD') AS period, agg.n, agg.subtotal, agg.discounts, agg.gross, agg.refunds, agg.cogs
      FROM generate_series(date_trunc(${grain}, ${range.from}::date::timestamp), ${range.to}::date::timestamp, ${step}::interval) g
      LEFT JOIN agg ON agg.p = g::date
     ORDER BY g`;
  return rows.map((r) => ({ period: r.period, ...toMetrics(r) }));
}

export type CashierRow = Metrics & { cashierId: string; name: string; role: string };

export async function salesByCashier(scope: Scope): Promise<CashierRow[]> {
  const rows = await prisma.$queryRaw<(RawMetrics & { cashierId: string })[]>`
    ${salesCte(scope)} SELECT "cashierId", ${METRIC_COLS} FROM x GROUP BY "cashierId"`;
  const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.cashierId) } }, select: { id: true, name: true, role: true } });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows
    .map((r) => ({ cashierId: r.cashierId, name: byId.get(r.cashierId)?.name ?? "Unknown", role: byId.get(r.cashierId)?.role ?? "", ...toMetrics(r) }))
    .sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));
}

export type MethodRow = Metrics & { method: PaymentMethod };

export async function salesByPaymentMethod(scope: Scope): Promise<MethodRow[]> {
  const rows = await prisma.$queryRaw<(RawMetrics & { method: PaymentMethod })[]>`
    ${salesCte(scope)} SELECT "paymentMethod"::text AS method, ${METRIC_COLS} FROM x GROUP BY "paymentMethod"`;
  return rows.map((r) => ({ method: r.method, ...toMetrics(r) })).sort((a, b) => b.revenue - a.revenue);
}

export type ProductRow = {
  productId: string;
  sku: string;
  name: string;
  category: string;
  soldQty: number;
  returnedQty: number;
  netQty: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number | null;
};

/**
 * Per-product net figures. Each line's revenue is its share of the sale total (the sale discount is spread
 * proportionally over its lines) minus that line's refunded amount, so per-product sums can differ from the
 * sale-level totals by a few UGX of rounding.
 */
export async function salesByProduct(scope: Scope, limit?: number): Promise<ProductRow[]> {
  const rows = await prisma.$queryRaw<
    { productId: string; sku: string; name: string; category: string; sold: bigint; returned: bigint; revenue: bigint; cogs: bigint }[]
  >`
    WITH s AS (SELECT s.id, s.subtotal, s.total FROM "Sale" s WHERE ${saleFilter(scope)}),
    ri AS (
      SELECT ri."saleItemId", SUM(ri.qty) AS qty, SUM(ri.amount) AS amount,
             SUM(CASE WHEN ri.restock THEN ri.qty ELSE 0 END) AS restocked
        FROM "RefundItem" ri
        JOIN "SaleItem" si ON si.id = ri."saleItemId"
        JOIN s ON s.id = si."saleId"
       GROUP BY ri."saleItemId"
    )
    SELECT p.id AS "productId", p.sku, p.name, c.name AS category,
           SUM(si.qty)::bigint AS sold,
           SUM(COALESCE(ri.qty, 0))::bigint AS returned,
           SUM(CASE WHEN s.subtotal > 0 THEN ROUND(si."lineTotal"::numeric * s.total / s.subtotal) ELSE 0 END
               - COALESCE(ri.amount, 0))::bigint AS revenue,
           SUM(si."unitCost"::bigint * (si.qty - COALESCE(ri.restocked, 0)))::bigint AS cogs
      FROM "SaleItem" si
      JOIN s ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN ri ON ri."saleItemId" = si.id
     GROUP BY p.id, p.sku, p.name, c.name
     ORDER BY SUM(si.qty - COALESCE(ri.qty, 0)) DESC, revenue DESC, p.name
     ${limit ? Prisma.sql`LIMIT ${limit}` : Prisma.empty}`;
  return rows.map((r) => {
    const revenue = Number(r.revenue);
    const cogs = Number(r.cogs);
    const soldQty = Number(r.sold);
    const returnedQty = Number(r.returned);
    return {
      productId: r.productId,
      sku: r.sku,
      name: r.name,
      category: r.category,
      soldQty,
      returnedQty,
      netQty: soldQty - returnedQty,
      revenue,
      cogs,
      profit: revenue - cogs,
      margin: revenue > 0 ? (revenue - cogs) / revenue : null,
    };
  });
}
