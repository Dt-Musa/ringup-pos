"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { inputCls } from "@/components/ui/modal";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";

export function UserFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`);
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

  const hasFilters = ["q", "role", "status"].some((k) => params.get(k));

  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name or email…"
        aria-label="Search users"
        className={`${inputCls} mt-0`}
      />
      <select aria-label="Filter by role" value={params.get("role") ?? ""} onChange={(e) => update("role", e.target.value)} className={`${inputCls} mt-0`}>
        <option value="">All roles</option>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      <select aria-label="Filter by status" value={params.get("status") ?? ""} onChange={(e) => update("status", e.target.value)} className={`${inputCls} mt-0`}>
        <option value="">Active &amp; inactive</option>
        <option value="active">Active only</option>
        <option value="inactive">Inactive only</option>
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
    </div>
  );
}
