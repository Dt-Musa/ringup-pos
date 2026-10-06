import { z } from "zod";
import { RANGE_PRESETS, daysBetween, resolveRange } from "../dates";

export const REPORT_KINDS = ["sales", "profit", "inventory", "best-sellers", "low-stock", "cashiers", "payments", "summary"] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];
export const GRAINS = ["day", "week", "month"] as const;
export const EXPORT_FORMATS = ["csv", "pdf"] as const;
export const MAX_RANGE_DAYS = 1100; // ~3 years

const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine((v) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return true; // already reported by the regex
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && v >= "2000-01-01";
  }, "Not a valid date");

const base = {
  preset: z.preprocess(emptyToUndef, z.enum(RANGE_PRESETS, { error: "Unknown date range preset" }).default("month")),
  from: z.preprocess(emptyToUndef, isoDate.optional()),
  to: z.preprocess(emptyToUndef, isoDate.optional()),
  grain: z.preprocess(emptyToUndef, z.enum(GRAINS, { error: "Group by day, week or month" }).default("day")),
};

function checkRange(v: { preset: (typeof RANGE_PRESETS)[number]; from?: string; to?: string }, ctx: z.RefinementCtx) {
  if (v.preset !== "custom") return;
  if (v.from && v.to && v.from > v.to) ctx.addIssue({ code: "custom", path: ["to"], message: "End date must be on or after the start date" });
  const r = resolveRange("custom", v.from, v.to);
  if (daysBetween(r.from, r.to) > MAX_RANGE_DAYS) ctx.addIssue({ code: "custom", path: ["from"], message: `Date range can be at most ${MAX_RANGE_DAYS} days` });
}

export const reportPageSchema = z.object({ ...base, tab: z.preprocess(emptyToUndef, z.enum(REPORT_KINDS).default("sales")) }).superRefine(checkRange);

export const reportExportSchema = z
  .object({
    ...base,
    report: z.enum(REPORT_KINDS, { error: `report must be one of: ${REPORT_KINDS.join(", ")}` }),
    format: z.enum(EXPORT_FORMATS, { error: "format must be csv or pdf" }),
  })
  .superRefine(checkRange);

export type ReportParams = { preset: (typeof RANGE_PRESETS)[number]; from?: string; to?: string; grain: (typeof GRAINS)[number] };
