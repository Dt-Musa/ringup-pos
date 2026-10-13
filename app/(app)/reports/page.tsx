import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { DonutChart, RankBarChart, TrendBarChart } from "@/components/charts/charts";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportSummary, ReportTable } from "@/components/reports/report-table";
import { guardPage } from "@/lib/auth";
import { PRESET_LABELS, RANGE_PRESETS, resolveRange } from "@/lib/dates";
import { buildReport, REPORT_TITLES } from "@/lib/reports";
import { REPORT_KINDS, reportPageSchema, type ReportKind } from "@/lib/validation/report";
import { Icon } from "@/components/ui/icon";

export const dynamic = "force-dynamic";

type SP = Record<string, string | string[] | undefined>;

const TAB_LABELS: Record<ReportKind, string> = {
  sales: "Sales",
  profit: "Profit",
  inventory: "Inventory",
  "best-sellers": "Best sellers",
  "low-stock": "Low stock",
  cashiers: "By cashier",
  payments: "By payment",
  summary: "Summary",
};
const PAGE_ROW_LIMIT = 200;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardPage("/reports");
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = reportPageSchema.safeParse(flat);
  const q = parsed.success ? parsed.data : reportPageSchema.parse({ tab: REPORT_KINDS.includes(flat.tab as ReportKind) ? flat.tab : undefined });
  const errors = parsed.success ? [] : parsed.error.issues.map((i) => i.message);

  const range = resolveRange(q.preset, q.from, q.to);
  const report = await buildReport(q.tab, q, { rowLimit: PAGE_ROW_LIMIT });

  const qs = (extra: Record<string, string>) => {
    const u = new URLSearchParams({ preset: q.preset, grain: q.grain, ...(q.preset === "custom" ? { from: range.from, to: range.to } : {}), ...extra });
    return u.toString();
  };
  const presets = RANGE_PRESETS.map((p) => {
    const r = p === "custom" ? range : resolveRange(p);
    return { value: p, label: PRESET_LABELS[p], from: r.from, to: r.to };
  });
  const exportHref = (format: "csv" | "pdf") => `/api/reports/export?${qs({ report: q.tab, format })}`;

  return (
    <>
      <PageHeader title="Reports" description="Sales, profit and stock reports. Money figures are net of refunds; times are Africa/Kampala." />
      {errors.length > 0 && (
        <div role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {errors.join(" ")} Showing this month instead.
        </div>
      )}

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-zinc-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-zinc-800" aria-label="Report types">
        {REPORT_KINDS.map((k) => {
          const active = k === q.tab;
          return (
            <Link
              key={k}
              href={`/reports?${qs({ tab: k })}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
                active ? "border-emerald-600 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {TAB_LABELS[k]}
            </Link>
          );
        })}
      </nav>

      <ReportFilters
        key={`${q.tab}-${q.preset}-${range.from}-${range.to}-${q.grain}`}
        tab={q.tab}
        preset={q.preset}
        from={range.from}
        to={range.to}
        grain={q.grain}
        showGrain={q.tab === "summary"}
        presets={presets}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{report.title ?? REPORT_TITLES[q.tab]}</h2>
          <p className="text-sm text-zinc-500" data-testid="report-period">
            {report.periodLabel}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <a href={exportHref("csv")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 sm:flex-none dark:border-zinc-700 dark:hover:bg-zinc-800" download>
            <Icon name="download" /> Export CSV
          </a>
          <a href={exportHref("pdf")} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 sm:flex-none" download>
            <Icon name="file-text" /> Download PDF
          </a>
        </div>
      </div>

      <ReportSummary report={report} />

      {report.chart && (
        <section className="mb-6 rounded-lg bg-white p-5 shadow-sm dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold">{report.chart.title}</h3>
          {report.chart.type === "bar" && <TrendBarChart data={report.chart.data} valueFormat={report.chart.valueFormat} />}
          {report.chart.type === "hbar" && <RankBarChart data={report.chart.data} valueFormat={report.chart.valueFormat} />}
          {report.chart.type === "donut" && <DonutChart data={report.chart.data} valueFormat={report.chart.valueFormat} />}
        </section>
      )}

      <ReportTable report={report} />

      {report.notes.length > 0 && (
        <ul className="mt-4 space-y-1 text-xs text-zinc-500">
          {report.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </>
  );
}
