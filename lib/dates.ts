// Dates in filters are YYYY-MM-DD in East Africa Time (UTC+3, no DST).
const TZ = "+03:00";

export function dayRangeEAT(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;
  return {
    ...(from ? { gte: new Date(`${from}T00:00:00.000${TZ}`) } : {}),
    ...(to ? { lte: new Date(`${to}T23:59:59.999${TZ}`) } : {}),
  };
}

/** Start of today in East Africa Time, as a Date. */
export function startOfTodayEAT(now = new Date()) {
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const y = eat.getUTCFullYear();
  const m = String(eat.getUTCMonth() + 1).padStart(2, "0");
  const d = String(eat.getUTCDate()).padStart(2, "0");
  return new Date(`${y}-${m}-${d}T00:00:00.000${TZ}`);
}

// ---- Local (Africa/Kampala, UTC+3) calendar helpers for reports/dashboards -------------------------------
// Dates are passed around as YYYY-MM-DD strings in local time; dayRangeEAT() turns them into UTC instants.

/** Today's local date as YYYY-MM-DD. */
export function todayEAT(now = new Date()) {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Adds n days to a YYYY-MM-DD date. */
export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `iso`. */
export function startOfWeek(iso: string) {
  const dow = new Date(`${iso}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(iso, -((dow + 6) % 7));
}

export function startOfMonth(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}

/** Whole days between two YYYY-MM-DD dates (to − from). */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export const RANGE_PRESETS = ["today", "week", "month", "last30", "custom"] as const;
export type RangePreset = (typeof RANGE_PRESETS)[number];
export const PRESET_LABELS: Record<RangePreset, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  custom: "Custom range",
};

export type LocalRange = { from: string; to: string };

/** Resolves a preset (or custom from/to) to an inclusive local date range. */
export function resolveRange(preset: RangePreset, from?: string, to?: string, now = new Date()): LocalRange {
  const today = todayEAT(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: startOfWeek(today), to: today };
    case "month":
      return { from: startOfMonth(today), to: today };
    case "last30":
      return { from: addDays(today, -29), to: today };
    case "custom": {
      const f = from ?? to ?? today;
      const t = to ?? from ?? today;
      return f <= t ? { from: f, to: t } : { from: t, to: f };
    }
  }
}

/** UTC instants for an inclusive local date range. */
export function rangeInstants(r: LocalRange) {
  return dayRangeEAT(r.from, r.to) as { gte: Date; lte: Date };
}

/** "1 Oct 2026" style label for a YYYY-MM-DD date. */
export function formatDay(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
}

/** "6 Oct 2026", "1 – 6 Oct 2026", "28 Sept – 4 Oct 2026", "29 Dec 2025 – 4 Jan 2026". */
export function formatRange(r: LocalRange) {
  if (r.from === r.to) return formatDay(r.from);
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  if (r.from.slice(0, 4) !== r.to.slice(0, 4)) return `${formatDay(r.from)} – ${formatDay(r.to)}`;
  if (r.from.slice(0, 7) !== r.to.slice(0, 7)) return `${fmt(r.from, { day: "numeric", month: "short" })} – ${formatDay(r.to)}`;
  return `${fmt(r.from, { day: "numeric" })} – ${formatDay(r.to)}`;
}
