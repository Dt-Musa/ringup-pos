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
