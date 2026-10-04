"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/modal";

export function InventoryFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    timer.current = setTimeout(() => update("q", q.trim()), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const status = params.get("status") ?? "all";
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or SKU…"
        aria-label="Search inventory"
        className={`${inputCls} mt-0 max-w-xs flex-1`}
      />
      <select aria-label="Filter by category" value={params.get("categoryId") ?? ""} onChange={(e) => update("categoryId", e.target.value)} className={`${inputCls} mt-0 w-auto`}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 text-sm dark:border-zinc-700" role="group" aria-label="Stock status">
        {[
          ["all", "All"],
          ["low", "Low"],
          ["out", "Out"],
        ].map(([v, label]) => (
          <button
            key={v}
            onClick={() => update("status", v === "all" ? "" : v)}
            aria-pressed={status === v}
            className={`px-3 py-2 ${status === v ? "bg-emerald-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
