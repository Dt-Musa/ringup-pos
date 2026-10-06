// Pure formatting for report cells – shared by the /reports page, the PDF and the CSV export so all three
// show the same numbers.
import { formatDateTime, formatNumber, formatPercent, formatUGX } from "./format";

export type ColFormat = "text" | "money" | "int" | "pct" | "datetime";
export type Cell = string | number | null;
export type Column = { key: string; label: string; format: ColFormat; weight?: number };

export function formatCell(v: Cell | undefined, format: ColFormat): string {
  if (v === null || v === undefined || v === "") return format === "text" ? "" : "—";
  switch (format) {
    case "money":
      return formatUGX(Number(v));
    case "int":
      return formatNumber(Number(v));
    case "pct":
      return formatPercent(Number(v));
    case "datetime":
      return formatDateTime(String(v));
    default:
      return String(v);
  }
}

/** Local (Africa/Kampala) "YYYY-MM-DD HH:mm" – sortable and spreadsheet-friendly. */
export function csvDateTime(iso: string) {
  return new Date(new Date(iso).getTime() + 3 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function isNumeric(format: ColFormat) {
  return format === "money" || format === "int" || format === "pct";
}
