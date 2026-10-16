"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/modal";
import type { CategoryOption } from "./types";

export function ProductFilters({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  // Debounced search-as-you-type
  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    timer.current = setTimeout(() => update("q", q.trim()), 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = ["q", "categoryId", "status", "stock"].some((k) => params.get(k));

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]" aria-busy={pending}>
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or SKU…"
        aria-label="Search products"
        className={`${inputCls} mt-0`}
      />
      <select aria-label="Filter by category" value={params.get("categoryId") ?? ""} onChange={(e) => update("categoryId", e.target.value)} className={`${inputCls} mt-0`}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select aria-label="Filter by status" value={params.get("status") ?? ""} onChange={(e) => update("status", e.target.value)} className={`${inputCls} mt-0`}>
        <option value="">Active &amp; inactive</option>
        <option value="active">Active only</option>
        <option value="inactive">Inactive only</option>
      </select>
      <select aria-label="Filter by stock" value={params.get("stock") ?? ""} onChange={(e) => update("stock", e.target.value)} className={`${inputCls} mt-0`}>
        <option value="">Any stock level</option>
        <option value="low">Low stock</option>
        <option value="out">Out of stock</option>
      </select>
      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            router.replace(pathname);
          }}
          className="text-sm text-emerald-700 hover:underline"
        >
          Clear
        </button>
      )}
      <span role="status" aria-live="polite" className="text-xs text-zinc-500 sm:col-span-2 lg:col-span-1">
        {pending ? "Updating…" : ""}
      </span>
    </div>
  );
}
