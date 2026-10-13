import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DonutChart, RankBarChart, TrendBarChart } from "@/components/charts/charts";
import { StockBadge } from "@/components/inventory/stock-badge";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, formatRange, rangeInstants, startOfMonth, startOfWeek, todayEAT } from "@/lib/dates";
import { getFinancials, salesByPaymentMethod, salesByPeriod, salesByProduct } from "@/lib/finance";
import { formatNumber, formatPercent, formatUGX, PAYMENT_LABELS } from "@/lib/format";
import { getInventorySummary, listAlerts, stockStatus } from "@/lib/inventory";

export const dynamic = "force-dynamic";

function Card({ label, value, sub, tone, className = "" }: { label: string; value: string; sub?: string; tone?: string; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/40 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className="min-h-8 text-xs font-semibold uppercase leading-4 tracking-wide text-zinc-600 sm:min-h-0 sm:text-sm">{label}</div>
      <div className={`mt-1 text-xl font-bold tracking-tight sm:mt-2 sm:text-2xl ${tone ?? ""}`}>{value}</div>
      {sub && <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-zinc-500 sm:text-xs">{sub}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children, action }: { title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/30 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const sales = (n: number) => `${formatNumber(n)} ${n === 1 ? "sale" : "sales"}`;

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const isStaff = user.role !== "CASHIER";
  // Cashiers only ever see their own sales; cost / profit figures are never loaded into their page.
  const own = isStaff ? {} : { cashierId: user.id };
  const my = (s: string) => (isStaff ? s : `My ${s.charAt(0).toLowerCase()}${s.slice(1)}`);

  const today = todayEAT();
  const last30 = { from: addDays(today, -29), to: today };
  const last30Scope = { range: rangeInstants(last30), ...own };

  const [dayFin, weekFin, monthFin, daily, methods, top, inv, alerts] = await Promise.all([
    getFinancials(rangeInstants({ from: today, to: today }), own),
    getFinancials(rangeInstants({ from: startOfWeek(today), to: today }), own),
    getFinancials(rangeInstants({ from: startOfMonth(today), to: today }), own),
    salesByPeriod(last30, "day", own),
    salesByPaymentMethod(last30Scope),
    salesByProduct(last30Scope, 5),
    getInventorySummary(),
    listAlerts(8),
  ]);

  // Only plain, role-appropriate values are passed to the (client) chart components.
  const dailyData = daily.map((d) => ({ label: formatDay(d.period).replace(/ \d{4}$/, ""), value: d.revenue, sub: sales(d.salesCount) }));
  const methodData = methods.map((m) => ({ label: PAYMENT_LABELS[m.method] ?? m.method, value: m.revenue }));
  const topData = top.filter((p) => p.netQty > 0).map((p) => ({ label: p.name, value: p.netQty, sub: formatUGX(p.revenue) }));
  const lowTotal = inv.lowStock + inv.outOfStock;

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}.${isStaff ? "" : " Figures below are your own sales."}`} />
      {denied && (
        <div role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          You don&apos;t have permission to view that page.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="dashboard-cards">
        <Card label={my("Net sales today")} value={formatUGX(dayFin.revenue)} sub={dayFin.refunds ? `${formatUGX(dayFin.refunds)} refunded` : undefined} />
        <Card label={my("Net sales this week")} value={formatUGX(weekFin.revenue)} sub={`${sales(weekFin.salesCount)} since Monday`} />
        <Card label={my("Net sales this month")} value={formatUGX(monthFin.revenue)} sub={sales(monthFin.salesCount)} />
        <Card label={my("Transactions today")} value={formatNumber(dayFin.salesCount)} sub={dayFin.salesCount ? `Avg. ${formatUGX(Math.round(dayFin.revenue / dayFin.salesCount))}` : undefined} />
        {isStaff && (
          <Card
            label="Gross profit this month"
            value={formatUGX(monthFin.profit)}
            sub={`Margin ${formatPercent(monthFin.margin)} · COGS ${formatUGX(monthFin.cogs)}`}
            tone={monthFin.profit < 0 ? "text-red-600" : ""}
          />
        )}
        <Card label="Active products" value={formatNumber(inv.totalProducts)} />
        <Card
          label="Low / out of stock"
          value={formatNumber(lowTotal)}
          sub={`${inv.lowStock} low · ${inv.outOfStock} out`}
          tone={inv.outOfStock ? "text-red-600" : inv.lowStock ? "text-amber-600" : ""}
          className="col-span-2 lg:col-span-2"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <Panel title={my("Daily net sales")} subtitle={`Last 30 days (${formatRange(last30)}), after refunds`}>
            <TrendBarChart data={dailyData} />
          </Panel>
        </div>
        <Panel title="Sales by payment method" subtitle="Net sales, last 30 days">
          <DonutChart data={methodData} />
        </Panel>
        <div className="lg:col-span-1">
          <Panel title="Top 5 best-selling products" subtitle="Units sold (net of returns), last 30 days">
            <RankBarChart data={topData} />
          </Panel>
        </div>
        <Panel
          title="Low stock"
          subtitle={lowTotal ? `${lowTotal} product${lowTotal === 1 ? "" : "s"} at or below minimum` : "All products are above their minimum"}
          action={
            isStaff && lowTotal ? (
              <Link href="/reports?tab=low-stock" className="text-sm font-medium text-emerald-700 hover:underline">
                View all
              </Link>
            ) : undefined
          }
        >
          {alerts.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing to reorder right now.</p>
          ) : (
            <ul className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800" data-testid="low-stock-list">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="text-xs text-zinc-500">
                      {a.sku} · {a.stockQty} in stock (min {a.minStock})
                    </div>
                  </div>
                  <StockBadge status={stockStatus(a.stockQty, a.minStock)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
