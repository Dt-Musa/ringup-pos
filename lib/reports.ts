import "server-only";
import { prisma } from "./db";
import { addDays, formatDay, formatRange, rangeInstants, resolveRange, type LocalRange } from "./dates";
import {
  getFinancials,
  salesByCashier,
  salesByPaymentMethod,
  salesByPeriod,
  salesByProduct,
  type Grain,
  type Metrics,
} from "./finance";
import { stockStatus } from "./inventory";
import { PAYMENT_LABELS, SALE_STATUS_LABELS } from "./format";
import type { Cell, ColFormat, Column } from "./report-format";
import type { ReportKind, ReportParams } from "./validation/report";

export type SummaryItem = { label: string; value: number | null; format: ColFormat };
export type ChartSpec = { type: "bar" | "donut" | "hbar"; title: string; valueFormat: "money" | "int"; data: { label: string; value: number }[] };

export type ReportData = {
  kind: ReportKind;
  title: string;
  periodLabel: string;
  range: LocalRange;
  summary: SummaryItem[];
  columns: Column[];
  rows: Record<string, Cell>[];
  totals?: Record<string, Cell>;
  totalRows: number; // rows available (rows may be truncated to rowLimit)
  notes: string[];
  chart?: ChartSpec;
};

export const REPORT_TITLES: Record<ReportKind, string> = {
  sales: "Sales report",
  profit: "Profit report",
  inventory: "Inventory report",
  "best-sellers": "Best-selling products",
  "low-stock": "Low-stock report",
  cashiers: "Sales by cashier",
  payments: "Sales by payment method",
  summary: "Sales summary",
};

const REFUND_NOTE = "All money figures are net of refunds; refunds count against the date of the original sale. Voided sales are excluded.";

function metricSummary(m: Metrics, withProfit = true): SummaryItem[] {
  return [
    { label: "Transactions", value: m.salesCount, format: "int" },
    { label: "Gross sales", value: m.grossRevenue, format: "money" },
    { label: "Refunds", value: m.refunds, format: "money" },
    { label: "Net sales", value: m.revenue, format: "money" },
    ...(withProfit
      ? ([
          { label: "Gross profit", value: m.profit, format: "money" },
          { label: "Margin", value: m.margin, format: "pct" },
        ] as SummaryItem[])
      : []),
  ];
}

function periodLabel(period: string, grain: Grain, range: LocalRange) {
  if (grain === "day") {
    const wd = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${period}T00:00:00Z`));
    return `${wd} ${formatDay(period)}`;
  }
  if (grain === "month") {
    return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${period}T00:00:00Z`));
  }
  // week buckets start on Monday; clip to the report range so partial weeks are obvious
  const from = period < range.from ? range.from : period;
  const end = addDays(period, 6);
  const to = end > range.to ? range.to : end;
  return formatRange({ from, to });
}

export async function buildReport(kind: ReportKind, params: ReportParams, opts: { rowLimit?: number } = {}): Promise<ReportData> {
  const range = resolveRange(params.preset, params.from, params.to);
  const scope = { range: rangeInstants(range) };
  const base = { kind, title: REPORT_TITLES[kind], periodLabel: formatRange(range), range, notes: [] as string[] };
  const limit = opts.rowLimit;

  switch (kind) {
    case "sales": {
      const where = { status: { not: "VOIDED" as const }, createdAt: scope.range };
      const [m, totalRows, sales] = await Promise.all([
        getFinancials(scope.range),
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            receiptNo: true,
            createdAt: true,
            paymentMethod: true,
            status: true,
            total: true,
            refundedAmount: true,
            cashier: { select: { name: true } },
            items: { select: { qty: true } },
          },
        }),
      ]);
      return {
        ...base,
        summary: metricSummary(m, false).concat([{ label: "Discounts given", value: m.discounts, format: "money" }]),
        columns: [
          { key: "receiptNo", label: "Receipt", format: "text" },
          { key: "date", label: "Date & time", format: "datetime", weight: 1.6 },
          { key: "cashier", label: "Cashier", format: "text" },
          { key: "payment", label: "Payment", format: "text" },
          { key: "items", label: "Items", format: "int", weight: 0.6 },
          { key: "gross", label: "Sale total", format: "money" },
          { key: "refunded", label: "Refunded", format: "money" },
          { key: "net", label: "Net", format: "money" },
          { key: "status", label: "Status", format: "text", weight: 1.3 },
        ],
        rows: sales.map((s) => ({
          receiptNo: s.receiptNo,
          date: s.createdAt.toISOString(),
          cashier: s.cashier.name,
          payment: PAYMENT_LABELS[s.paymentMethod] ?? s.paymentMethod,
          items: s.items.reduce((a, i) => a + i.qty, 0),
          gross: s.total,
          refunded: s.refundedAmount,
          net: s.total - s.refundedAmount,
          status: SALE_STATUS_LABELS[s.status] ?? s.status,
        })),
        totals: { receiptNo: "Total", gross: m.grossRevenue, refunded: m.refunds, net: m.revenue },
        totalRows,
        notes: [REFUND_NOTE, "Sale total is after the sale's discount."],
      };
    }

    case "profit": {
      const [m, products] = await Promise.all([getFinancials(scope.range), salesByProduct(scope)]);
      const byCat = new Map<string, { revenue: number; cogs: number; qty: number }>();
      for (const p of products) {
        const c = byCat.get(p.category) ?? { revenue: 0, cogs: 0, qty: 0 };
        c.revenue += p.revenue;
        c.cogs += p.cogs;
        c.qty += p.netQty;
        byCat.set(p.category, c);
      }
      const rows = [...byCat.entries()]
        .map(([category, c]) => ({ category, qty: c.qty, revenue: c.revenue, cogs: c.cogs, profit: c.revenue - c.cogs, margin: c.revenue > 0 ? (c.revenue - c.cogs) / c.revenue : null }))
        .sort((a, b) => b.profit - a.profit);
      return {
        ...base,
        summary: [
          { label: "Sales before discounts", value: m.subtotal, format: "money" },
          { label: "Discounts", value: m.discounts, format: "money" },
          { label: "Refunds", value: m.refunds, format: "money" },
          { label: "Net revenue", value: m.revenue, format: "money" },
          { label: "Cost of goods sold", value: m.cogs, format: "money" },
          { label: "Gross profit", value: m.profit, format: "money" },
          { label: "Gross margin", value: m.margin, format: "pct" },
        ],
        columns: [
          { key: "category", label: "Category", format: "text", weight: 1.6 },
          { key: "qty", label: "Units sold (net)", format: "int" },
          { key: "revenue", label: "Net revenue", format: "money" },
          { key: "cogs", label: "COGS", format: "money" },
          { key: "profit", label: "Gross profit", format: "money" },
          { key: "margin", label: "Margin", format: "pct" },
        ],
        rows,
        totals: { category: "Total (all sales)", revenue: m.revenue, cogs: m.cogs, profit: m.profit, margin: m.margin },
        totalRows: rows.length,
        notes: [
          REFUND_NOTE,
          "COGS uses the buying cost recorded at the time of each sale; restocked returns recover their cost, damaged (not restocked) returns stay as cost.",
          "Category revenue spreads each sale's discount over its lines, so category rows can differ from the total by a few UGX of rounding.",
        ],
      };
    }

    case "inventory": {
      const products = await prisma.product.findMany({
        where: { active: true },
        orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
        select: { sku: true, name: true, stockQty: true, minStock: true, buyingCost: true, sellingPrice: true, category: { select: { name: true } } },
      });
      const rows = products.map((p) => ({
        sku: p.sku,
        name: p.name,
        category: p.category.name,
        stock: p.stockQty,
        minStock: p.minStock,
        status: { IN_STOCK: "In stock", LOW: "Low", OUT: "Out of stock" }[stockStatus(p.stockQty, p.minStock)],
        cost: p.buyingCost,
        price: p.sellingPrice,
        valueCost: Math.max(0, p.stockQty) * p.buyingCost,
        valueRetail: Math.max(0, p.stockQty) * p.sellingPrice,
      }));
      const sum = (k: "stock" | "valueCost" | "valueRetail") => rows.reduce((a, r) => a + r[k], 0);
      const cost = sum("valueCost");
      const retail = sum("valueRetail");
      return {
        ...base,
        periodLabel: `Snapshot as of ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date())}`,
        summary: [
          { label: "Active products", value: rows.length, format: "int" },
          { label: "Units in stock", value: sum("stock"), format: "int" },
          { label: "Value at cost", value: cost, format: "money" },
          { label: "Value at retail", value: retail, format: "money" },
          { label: "Potential gross profit", value: retail - cost, format: "money" },
          { label: "Low / out of stock", value: rows.filter((r) => r.status !== "In stock").length, format: "int" },
        ],
        columns: [
          { key: "sku", label: "SKU", format: "text", weight: 0.9 },
          { key: "name", label: "Product", format: "text", weight: 2.2 },
          { key: "category", label: "Category", format: "text" },
          { key: "stock", label: "Stock", format: "int", weight: 0.7 },
          { key: "minStock", label: "Min", format: "int", weight: 0.6 },
          { key: "status", label: "Status", format: "text", weight: 1 },
          { key: "cost", label: "Unit cost", format: "money" },
          { key: "price", label: "Unit price", format: "money" },
          { key: "valueCost", label: "Value at cost", format: "money", weight: 1.3 },
          { key: "valueRetail", label: "Value at retail", format: "money", weight: 1.3 },
        ],
        rows,
        totals: { sku: "Total", stock: sum("stock"), valueCost: cost, valueRetail: retail },
        totalRows: rows.length,
        notes: ["Current stock levels of active products; the date range does not apply to this report."],
      };
    }

    case "best-sellers": {
      const products = await salesByProduct(scope);
      const rows = products
        .filter((p) => p.netQty > 0)
        .map((p, i) => ({ rank: i + 1, sku: p.sku, name: p.name, category: p.category, qty: p.netQty, returned: p.returnedQty, revenue: p.revenue, cogs: p.cogs, profit: p.profit, margin: p.margin }));
      return {
        ...base,
        summary: [
          { label: "Products sold", value: rows.length, format: "int" },
          { label: "Units sold (net)", value: rows.reduce((a, r) => a + r.qty, 0), format: "int" },
          { label: "Units returned", value: products.reduce((a, r) => a + r.returnedQty, 0), format: "int" },
        ],
        columns: [
          { key: "rank", label: "#", format: "int", weight: 0.4 },
          { key: "sku", label: "SKU", format: "text", weight: 0.9 },
          { key: "name", label: "Product", format: "text", weight: 2.2 },
          { key: "category", label: "Category", format: "text" },
          { key: "qty", label: "Units (net)", format: "int", weight: 0.8 },
          { key: "returned", label: "Returned", format: "int", weight: 0.8 },
          { key: "revenue", label: "Net revenue", format: "money" },
          { key: "cogs", label: "COGS", format: "money" },
          { key: "profit", label: "Gross profit", format: "money" },
          { key: "margin", label: "Margin", format: "pct", weight: 0.7 },
        ],
        rows: limit ? rows.slice(0, limit) : rows,
        totalRows: rows.length,
        notes: ["Ranked by units sold net of returns. " + REFUND_NOTE],
        chart: { type: "hbar", title: "Top 10 by units sold", valueFormat: "int", data: rows.slice(0, 10).map((r) => ({ label: r.name, value: r.qty })) },
      };
    }

    case "low-stock": {
      const [items, sold] = await Promise.all([
        prisma.product.findMany({
          where: { active: true, stockQty: { lte: prisma.product.fields.minStock } },
          orderBy: [{ stockQty: "asc" }, { name: "asc" }],
          select: { id: true, sku: true, name: true, stockQty: true, minStock: true, buyingCost: true, category: { select: { name: true } } },
        }),
        salesByProduct(scope),
      ]);
      const soldById = new Map(sold.map((p) => [p.productId, p.netQty]));
      const rows = items
        .map((p) => {
          const reorder = Math.max(0, p.minStock * 2 - p.stockQty);
          return {
            sku: p.sku,
            name: p.name,
            category: p.category.name,
            stock: p.stockQty,
            minStock: p.minStock,
            status: p.stockQty <= 0 ? "Out of stock" : "Low",
            sold: soldById.get(p.id) ?? 0,
            reorder,
            reorderCost: reorder * p.buyingCost,
          };
        })
        .sort((a, b) => Number(a.stock > 0) - Number(b.stock > 0) || a.stock / Math.max(1, a.minStock) - b.stock / Math.max(1, b.minStock));
      return {
        ...base,
        periodLabel: `Current stock; units sold for ${formatRange(range)}`,
        summary: [
          { label: "Out of stock", value: rows.filter((r) => r.stock <= 0).length, format: "int" },
          { label: "Low stock", value: rows.filter((r) => r.stock > 0).length, format: "int" },
          { label: "Est. reorder cost", value: rows.reduce((a, r) => a + r.reorderCost, 0), format: "money" },
        ],
        columns: [
          { key: "sku", label: "SKU", format: "text", weight: 0.9 },
          { key: "name", label: "Product", format: "text", weight: 2.2 },
          { key: "category", label: "Category", format: "text" },
          { key: "stock", label: "Stock", format: "int", weight: 0.7 },
          { key: "minStock", label: "Min", format: "int", weight: 0.6 },
          { key: "status", label: "Status", format: "text" },
          { key: "sold", label: "Sold in period", format: "int" },
          { key: "reorder", label: "Suggested reorder", format: "int" },
          { key: "reorderCost", label: "Reorder cost", format: "money" },
        ],
        rows,
        totalRows: rows.length,
        notes: ["Products at or below their minimum stock. Suggested reorder tops stock up to 2× the minimum, at current buying cost."],
      };
    }

    case "cashiers": {
      const [m, rows] = await Promise.all([getFinancials(scope.range), salesByCashier(scope)]);
      return {
        ...base,
        summary: metricSummary(m),
        columns: [
          { key: "name", label: "Cashier", format: "text", weight: 1.6 },
          { key: "role", label: "Role", format: "text", weight: 0.9 },
          { key: "count", label: "Transactions", format: "int" },
          { key: "gross", label: "Gross sales", format: "money" },
          { key: "refunds", label: "Refunds", format: "money" },
          { key: "net", label: "Net sales", format: "money" },
          { key: "avg", label: "Avg. sale (net)", format: "money" },
          { key: "profit", label: "Gross profit", format: "money" },
        ],
        rows: rows.map((r) => ({
          name: r.name,
          role: r.role.charAt(0) + r.role.slice(1).toLowerCase(),
          count: r.salesCount,
          gross: r.grossRevenue,
          refunds: r.refunds,
          net: r.revenue,
          avg: r.salesCount ? Math.round(r.revenue / r.salesCount) : null,
          profit: r.profit,
        })),
        totals: { name: "Total", count: m.salesCount, gross: m.grossRevenue, refunds: m.refunds, net: m.revenue, avg: m.salesCount ? Math.round(m.revenue / m.salesCount) : null, profit: m.profit },
        totalRows: rows.length,
        notes: [REFUND_NOTE, "A sale belongs to the user who rang it up."],
        chart: { type: "hbar", title: "Net sales by cashier", valueFormat: "money", data: rows.map((r) => ({ label: r.name, value: r.revenue })) },
      };
    }

    case "payments": {
      const [m, rows] = await Promise.all([getFinancials(scope.range), salesByPaymentMethod(scope)]);
      return {
        ...base,
        summary: metricSummary(m, false),
        columns: [
          { key: "method", label: "Payment method", format: "text", weight: 1.6 },
          { key: "count", label: "Transactions", format: "int" },
          { key: "gross", label: "Gross sales", format: "money" },
          { key: "refunds", label: "Refunds", format: "money" },
          { key: "net", label: "Net sales", format: "money" },
          { key: "share", label: "Share of net", format: "pct" },
        ],
        rows: rows.map((r) => ({
          method: PAYMENT_LABELS[r.method] ?? r.method,
          count: r.salesCount,
          gross: r.grossRevenue,
          refunds: r.refunds,
          net: r.revenue,
          share: m.revenue > 0 ? r.revenue / m.revenue : null,
        })),
        totals: { method: "Total", count: m.salesCount, gross: m.grossRevenue, refunds: m.refunds, net: m.revenue, share: m.revenue > 0 ? 1 : null },
        totalRows: rows.length,
        notes: [REFUND_NOTE],
        chart: { type: "donut", title: "Net sales by payment method", valueFormat: "money", data: rows.map((r) => ({ label: PAYMENT_LABELS[r.method] ?? r.method, value: r.revenue })) },
      };
    }

    case "summary": {
      const grain = params.grain;
      const [m, periods] = await Promise.all([getFinancials(scope.range), salesByPeriod(range, grain)]);
      const rows = periods.map((p) => ({
        period: periodLabel(p.period, grain, range),
        count: p.salesCount,
        gross: p.grossRevenue,
        discounts: p.discounts,
        refunds: p.refunds,
        net: p.revenue,
        cogs: p.cogs,
        profit: p.profit,
        margin: p.margin,
      }));
      return {
        ...base,
        title: `Sales summary (${{ day: "daily", week: "weekly", month: "monthly" }[grain]})`,
        summary: metricSummary(m),
        columns: [
          { key: "period", label: { day: "Day", week: "Week (Mon–Sun)", month: "Month" }[grain], format: "text", weight: 1.6 },
          { key: "count", label: "Transactions", format: "int" },
          { key: "gross", label: "Gross sales", format: "money" },
          { key: "discounts", label: "Discounts", format: "money" },
          { key: "refunds", label: "Refunds", format: "money" },
          { key: "net", label: "Net sales", format: "money" },
          { key: "cogs", label: "COGS", format: "money" },
          { key: "profit", label: "Gross profit", format: "money" },
          { key: "margin", label: "Margin", format: "pct", weight: 0.7 },
        ],
        rows,
        totals: { period: "Total", count: m.salesCount, gross: m.grossRevenue, discounts: m.discounts, refunds: m.refunds, net: m.revenue, cogs: m.cogs, profit: m.profit, margin: m.margin },
        totalRows: rows.length,
        notes: [REFUND_NOTE, "Gross sales are after discounts. Weeks run Monday to Sunday (Africa/Kampala time)."],
        chart: { type: "bar", title: "Net sales", valueFormat: "money", data: rows.map((r) => ({ label: r.period, value: r.net })) },
      };
    }
  }
}
