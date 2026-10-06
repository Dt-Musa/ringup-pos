import { formatCell, isNumeric } from "@/lib/report-format";
import type { ReportData } from "@/lib/reports";

export function ReportSummary({ report }: { report: ReportData }) {
  if (!report.summary.length) return null;
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="report-summary">
      {report.summary.map((s) => (
        <div key={s.label} className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">{s.label}</div>
          <div className={`mt-1 text-xl font-semibold ${s.format === "money" && (s.value ?? 0) < 0 ? "text-red-600" : ""}`}>{formatCell(s.value, s.format)}</div>
        </div>
      ))}
    </div>
  );
}

export function ReportTable({ report }: { report: ReportData }) {
  const { columns, rows, totals } = report;
  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
      <table className="w-full text-sm" data-testid="report-table">
        <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/50">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${isNumeric(c.format) ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-zinc-500">
                {report.kind === "low-stock" ? "No products are low or out of stock." : "No data for this period."}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${isNumeric(c.format) ? "text-right tabular-nums" : ""}`}>
                  {formatCell(r[c.key], c.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && rows.length > 0 && (
          <tfoot className="border-t-2 border-zinc-300 font-semibold dark:border-zinc-700">
            <tr>
              {columns.map((c) => (
                <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${isNumeric(c.format) ? "text-right tabular-nums" : ""}`}>
                  {totals[c.key] === undefined ? "" : formatCell(totals[c.key], c.format)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {rows.length < report.totalRows && (
        <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800">
          Showing the latest {rows.length.toLocaleString("en-US")} of {report.totalRows.toLocaleString("en-US")} sales. Export CSV for the full list; totals cover all of them.
        </p>
      )}
    </div>
  );
}
