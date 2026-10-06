"use client";

import { useRef } from "react";
import { inputCls, btnPrimary } from "@/components/ui/modal";

type Props = {
  tab: string;
  preset: string;
  from: string;
  to: string;
  grain: string;
  showGrain: boolean;
  presets: { value: string; label: string; from: string; to: string }[];
};

/**
 * Plain GET form (works without JavaScript). With JS, picking a preset fills in its dates and editing a date
 * switches the preset to "Custom range".
 */
export function ReportFilters({ tab, preset, from, to, grain, showGrain, presets }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const field = (name: string) => formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;

  return (
    <form ref={formRef} method="get" action="/reports" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900" aria-label="Report filters">
      <input type="hidden" name="tab" value={tab} />
      <label className="text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">Date range</span>
        <select
          name="preset"
          defaultValue={preset}
          className={`${inputCls} w-44`}
          onChange={(e) => {
            const p = presets.find((x) => x.value === e.target.value);
            if (p && p.value !== "custom") {
              const f = field("from");
              const t = field("to");
              if (f) f.value = p.from;
              if (t) t.value = p.to;
              formRef.current?.requestSubmit();
            }
          }}
        >
          {presets.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">From</span>
        <input type="date" name="from" defaultValue={from} max={to} className={`${inputCls} w-40`} onChange={() => { const p = field("preset"); if (p) p.value = "custom"; }} />
      </label>
      <label className="text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">To</span>
        <input type="date" name="to" defaultValue={to} className={`${inputCls} w-40`} onChange={() => { const p = field("preset"); if (p) p.value = "custom"; }} />
      </label>
      {showGrain ? (
        <label className="text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Group by</span>
          <select name="grain" defaultValue={grain} className={`${inputCls} w-32`}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="grain" value={grain} />
      )}
      <button type="submit" className={btnPrimary}>
        Apply
      </button>
    </form>
  );
}
