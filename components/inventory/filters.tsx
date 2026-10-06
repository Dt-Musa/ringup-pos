"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/modal";

const STATUSES = [
  ["all", "All"],
  ["low", "Low"],
  ["out", "Out"],
] as const;

/**
 * Inventory filters. Built as a real <form method="get"> plus plain links, so they work even before
 * (or without) JavaScript hydration; when JS is available the form is submitted client-side
 * (search-as-you-type, instant select/status changes) and a pending indicator is shown.
 */
export function InventoryFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();
  const urlQ = params.get("q") ?? "";
  const [q, setQ] = useState(urlQ);
  const status = params.get("status") === "low" || params.get("status") === "out" ? params.get("status")! : "all";
  const categoryId = params.get("categoryId") ?? "";

  // keep the box in sync when the URL changes from elsewhere (back button, Clear, status links)
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setQ(urlQ);
  }
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const hrefFor = (overrides: Record<string, string>) => {
    const next = new URLSearchParams();
    const merged = { q: urlQ, categoryId, status: status === "all" ? "" : status, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v);
    const s = next.toString();
    return s ? `${pathname}?${s}` : pathname;
  };

  function submitForm(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    const fd = new FormData(formRef.current!);
    const href = hrefFor({
      q: String(fd.get("q") ?? "").trim(),
      categoryId: String(fd.get("categoryId") ?? ""),
      status: String(fd.get("status") ?? ""),
    });
    startTransition(() => router.replace(href));
  }

  const hasFilters = !!(urlQ || categoryId || status !== "all");

  return (
    <form ref={formRef} method="get" action={pathname} onSubmit={submitForm} className="mb-4 grid gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3" data-testid="inventory-filters">
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => formRef.current?.requestSubmit(), 250);
        }}
        placeholder="Search name or SKU…"
        aria-label="Search inventory"
        className={`${inputCls.replace("w-full", "")} mt-0 min-w-0 max-w-none flex-1 sm:min-w-[14rem] sm:max-w-xs`}
      />
      <select
        name="categoryId"
        aria-label="Filter by category"
        value={categoryId}
        onChange={(e) => {
          // controlled by the URL; submit immediately with the new value
          const fd = new FormData(formRef.current!);
          fd.set("categoryId", e.target.value);
          startTransition(() => router.replace(hrefFor({ q: String(fd.get("q") ?? "").trim(), categoryId: e.target.value })));
        }}
        className={`${inputCls.replace("w-full", "")} mt-0`}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input type="hidden" name="status" value={status === "all" ? "" : status} />
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-zinc-300 text-sm dark:border-zinc-700 sm:inline-flex" role="group" aria-label="Stock status">
        {STATUSES.map(([v, label]) => (
          <Link
            key={v}
            href={hrefFor({ status: v === "all" ? "" : v })}
            replace
            aria-current={status === v ? "true" : undefined}
            className={`min-h-10 px-3 py-2 text-center ${status === v ? "bg-emerald-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <button type="submit" className="min-h-10 rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
        Apply
      </button>
      {hasFilters && (
        <Link href={pathname} replace className="text-sm text-emerald-700 hover:underline">
          Clear
        </Link>
      )}
      <span role="status" aria-live="polite" className="text-xs text-zinc-500">
        {pending ? "Updating…" : ""}
      </span>
    </form>
  );
}
