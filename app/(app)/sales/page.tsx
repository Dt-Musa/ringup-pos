import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SaleStatusBadge } from "@/components/sales/status-badge";
import { inputCls } from "@/components/ui/modal";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatUGX, PAYMENT_LABELS } from "@/lib/format";
import { listSales } from "@/lib/sales-query";
import { listSalesSchema } from "@/lib/validation/refund";
import { Icon } from "@/components/ui/icon";

type SP = Record<string, string | string[] | undefined>;
const FILTER_KEYS = ["q", "from", "to", "cashierId", "paymentMethod", "status"];

export default async function SalesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await guardPage("/sales");
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listSalesSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : listSalesSchema.parse({});
  const isStaff = user.role !== "CASHIER";

  const [data, cashiers] = await Promise.all([
    listSales(filters, user),
    isStaff ? prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }) : Promise.resolve([]),
  ]);
  const hasFilters = FILTER_KEYS.some((k) => (flat as Record<string, string | undefined>)[k]);

  const pageHref = (page: number) => {
    const u = new URLSearchParams(Object.entries(flat).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(page));
    return `/sales?${u.toString()}`;
  };
  const t = data.totals;
  const cards = [
    { id: "count", label: "Sales", value: String(t.count) },
    { id: "gross", label: "Gross sales", value: formatUGX(t.gross) },
    { id: "refunded", label: "Refunded", value: formatUGX(t.refunded), tone: t.refunded ? "text-red-600" : "" },
    { id: "net", label: "Net sales", value: formatUGX(t.net) },
  ];

  return (
    <>
      <PageHeader title="Sales" description={isStaff ? "All sales, with filters and refunds." : "Your completed sales."} />

      <form method="get" action="/sales" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="sales-filters">
        <input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="Receipt no. (e.g. RU-000012)" aria-label="Search receipt number" className={`${inputCls} mt-0 lg:col-span-2`} />
        <input type="date" name="from" defaultValue={filters.from ?? ""} aria-label="From date" className={`${inputCls} mt-0`} />
        <input type="date" name="to" defaultValue={filters.to ?? ""} aria-label="To date" className={`${inputCls} mt-0`} />
        <select name="paymentMethod" defaultValue={filters.paymentMethod ?? ""} aria-label="Payment method" className={`${inputCls} mt-0`}>
          <option value="">All payments</option>
          {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={filters.status ?? ""} aria-label="Status" className={`${inputCls} mt-0`}>
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="PARTIALLY_REFUNDED">Partially refunded</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        {isStaff && (
          <select name="cashierId" defaultValue={filters.cashierId ?? ""} aria-label="Cashier" className={`${inputCls} mt-0 lg:col-span-2`}>
            <option value="">All cashiers</option>
            {cashiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="min-h-10 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Apply filters
          </button>
          {hasFilters && (
            <Link href="/sales" className="inline-flex min-h-10 items-center rounded-lg border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Clear
            </Link>
          )}
          <span className="self-center text-xs text-zinc-500">Dates are East Africa Time.</span>
        </div>
      </form>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="sales-totals">
        {cards.map((c) => (
          <div key={c.id} data-testid={`total-${c.id}`} className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
            <div className="text-xs text-zinc-500">{c.label}{hasFilters ? " (filtered)" : ""}</div>
            <div className={`mt-1 text-xl font-semibold ${c.tone ?? ""}`}>{c.value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="sales-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Receipt</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Cashier</th>
              <th className="px-4 py-2 text-right">Items</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Refunded</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {data.sales.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  {hasFilters ? "No sales match these filters." : <>No sales yet. <Link href="/pos" className="text-emerald-700 hover:underline">Open the POS</Link> to make one.</>}
                </td>
              </tr>
            )}
            {data.sales.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td data-label="Receipt" className="px-4 py-2 font-mono text-xs font-semibold">
                  <Link href={`/sales/${s.id}`} className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950">
                    {s.receiptNo}
                  </Link>
                </td>
                <td data-label="Date" className="whitespace-nowrap px-4 py-2">{formatDateTime(s.createdAt)}</td>
                <td data-label="Cashier" data-secondary="true" className="px-4 py-2">{s.cashier.name}</td>
                <td data-label="Items" className="px-4 py-2 text-right">{s._count.items}</td>
                <td data-label="Payment" className="px-4 py-2">{PAYMENT_LABELS[s.paymentMethod]}</td>
                <td data-label="Total" className="px-4 py-2 text-right font-medium">{formatUGX(s.total)}</td>
                <td data-label="Refunded" data-secondary="true" className={`px-4 py-2 text-right ${s.refundedAmount ? "text-red-600" : "text-zinc-400"}`}>{s.refundedAmount ? `-${formatUGX(s.refundedAmount)}` : "—"}</td>
                <td data-label="Status" className="px-4 py-2">
                  <SaleStatusBadge status={s.status} />
                </td>
                <td data-label="Actions" className="whitespace-nowrap px-4 py-2 text-right">
                  <Link href={`/sales/${s.id}`} className="mr-3 inline-flex min-h-10 items-center gap-1.5 font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950">
                    <Icon name="eye" /> Details
                  </Link>
                  <Link href={`/sales/${s.id}/receipt`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950">
                    <Icon name="receipt" /> Receipt
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {data.total} sale{data.total === 1 ? "" : "s"}
        </span>
        {data.pages > 1 && (
          <div className="flex items-center gap-3">
            {data.page > 1 && <Link href={pageHref(data.page - 1)} className="text-emerald-700 hover:underline">← Previous</Link>}
            <span>
              Page {data.page} of {data.pages}
            </span>
            {data.page < data.pages && <Link href={pageHref(data.page + 1)} className="text-emerald-700 hover:underline">Next →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
