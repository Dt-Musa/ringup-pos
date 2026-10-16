import { cache, Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DonutChart, RankBarChart, TrendBarChart } from "@/components/charts/charts";
import { StockBadge } from "@/components/inventory/stock-badge";
import { requireUser } from "@/lib/auth";
import { addDays, formatDay, formatRange, rangeInstants, startOfMonth, startOfWeek, todayEAT } from "@/lib/dates";
import { getFinancials, salesByPaymentMethod, salesByPeriod, salesByProduct, type Scope } from "@/lib/finance";
import { formatNumber, formatPercent, formatUGX, PAYMENT_LABELS } from "@/lib/format";
import { getInventorySummary, listAlerts, stockStatus } from "@/lib/inventory";

export const dynamic = "force-dynamic";

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white p-5 shadow-sm shadow-zinc-200/40 transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${tone ?? ""}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
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

const getDashboardInventorySummary = cache(async () => getInventorySummary());

function CardsFallback({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Loading dashboard summary" className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="h-24 animate-pulse rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
      ))}
      <span className="sr-only">Loading dashboard summary…</span>
    </div>
  );
}

function PanelFallback() {
  return (
    <div role="status" aria-label="Loading dashboard panel" className="h-64 animate-pulse rounded-xl border border-zinc-200/80 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <span className="sr-only">Loading dashboard panel…</span>
    </div>
  );
}

async function DashboardSummary({ today, scope, isStaff }: { today: string; scope: Scope; isStaff: boolean }) {
  const [dayFin, weekFin, monthFin, inv] = await Promise.all([
    getFinancials(rangeInstants({ from: today, to: today }), scope),
    getFinancials(rangeInstants({ from: startOfWeek(today), to: today }), scope),
    getFinancials(rangeInstants({ from: startOfMonth(today), to: today }), scope),
    getDashboardInventorySummary(),
  ]);

  const label = (value: string) => (isStaff ? value : `My ${value.charAt(0).toLowerCase()}${value.slice(1)}`);
  const lowTotal = inv.lowStock + inv.outOfStock;

  return (
    <div className="grid grid-cols-2 gap-4" data-testid="dashboard-cards">
      <Card label={label("Net sales today")} value={formatUGX(dayFin.revenue)} sub={dayFin.refunds ? `${formatUGX(dayFin.refunds)} refunded` : undefined} />
      <Card label={label("Net sales this week")} value={formatUGX(weekFin.revenue)} sub={`${sales(weekFin.salesCount)} since Monday`} />
      <Card label={label("Net sales this month")} value={formatUGX(monthFin.revenue)} sub={sales(monthFin.salesCount)} />
      <Card label={label("Transactions today")} value={formatNumber(dayFin.salesCount)} sub={dayFin.salesCount ? `Avg. ${formatUGX(Math.round(dayFin.revenue / dayFin.salesCount))}` : undefined} />
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
      />
    </div>
  );
}

async function DailySalesPanel({ last30, scope, isStaff }: { last30: { from: string; to: string }; scope: Scope; isStaff: boolean }) {
  const daily = await salesByPeriod(last30, "day", scope);
  const data = daily.map((d) => ({ label: formatDay(d.period).replace(/ \d{4}$/, ""), value: d.revenue, sub: sales(d.salesCount) }));
  const title = isStaff ? "Daily net sales" : "My daily net sales";

  return (
    <Panel title={title} subtitle={`Last 30 days (${formatRange(last30)}), after refunds`}>
      <TrendBarChart data={data} />
    </Panel>
  );
}

async function PaymentMethodPanel({ last30, scope }: { last30: { from: string; to: string }; scope: Scope }) {
  const methods = await salesByPaymentMethod({ range: rangeInstants(last30), ...scope });
  const data = methods.map((m) => ({ label: PAYMENT_LABELS[m.method] ?? m.method, value: m.revenue }));

  return (
    <Panel title="Sales by payment method" subtitle="Net sales, last 30 days">
      <DonutChart data={data} />
    </Panel>
  );
}

async function TopProductsPanel({ last30, scope }: { last30: { from: string; to: string }; scope: Scope }) {
  const top = await salesByProduct({ range: rangeInstants(last30), ...scope }, 5);
  const data = top.filter((p) => p.netQty > 0).map((p) => ({ label: p.name, value: p.netQty, sub: formatUGX(p.revenue) }));

  return (
    <Panel title="Top 5 best-selling products" subtitle="Units sold (net of returns), last 30 days">
      <RankBarChart data={data} />
    </Panel>
  );
}

async function LowStockPanel({ isStaff }: { isStaff: boolean }) {
  const [inv, alerts] = await Promise.all([getDashboardInventorySummary(), listAlerts(8)]);
  const lowTotal = inv.lowStock + inv.outOfStock;

  return (
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
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;
  const isStaff = user.role !== "CASHIER";
  const scope: Scope = isStaff ? {} : { cashierId: user.id };

  const today = todayEAT();
  const last30 = { from: addDays(today, -29), to: today };

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}.${isStaff ? "" : " Figures below are your own sales."}`} />
      {denied && (
        <div role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          You don&apos;t have permission to view that page.
        </div>
      )}

      <Suspense fallback={<CardsFallback count={isStaff ? 7 : 6} />}>
        <DashboardSummary today={today} scope={scope} isStaff={isStaff} />
      </Suspense>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Suspense fallback={<PanelFallback />}>
          <DailySalesPanel last30={last30} scope={scope} isStaff={isStaff} />
        </Suspense>
        <Suspense fallback={<PanelFallback />}>
          <PaymentMethodPanel last30={last30} scope={scope} />
        </Suspense>
        <Suspense fallback={<PanelFallback />}>
          <TopProductsPanel last30={last30} scope={scope} />
        </Suspense>
        <Suspense fallback={<PanelFallback />}>
          <LowStockPanel isStaff={isStaff} />
        </Suspense>
      </div>
    </>
  );
}
