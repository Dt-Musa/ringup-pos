"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/inventory", label: "Stock overview" },
  { href: "/inventory/history", label: "Stock history" },
  { href: "/inventory/purchases", label: "Purchases" },
  { href: "/inventory/suppliers", label: "Suppliers" },
];

export function InventoryTabs() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800" aria-label="Inventory sections">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              active ? "border-emerald-600 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
