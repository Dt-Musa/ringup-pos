"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_LABELS, type NavItem, type Role } from "@/lib/permissions";

type IconName = "dashboard" | "pos" | "products" | "inventory" | "sales" | "reports" | "users" | "more" | "logout";

const ICONS: Record<string, IconName> = {
  Dashboard: "dashboard",
  POS: "pos",
  Products: "products",
  Inventory: "inventory",
  Sales: "sales",
  Reports: "reports",
  Users: "users",
};

const MOBILE_TABS = ["Dashboard", "POS", "Products", "Sales"];

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    dashboard: "M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z",
    pos: "M4 5h16v14H4V5Zm3 3h10M7 12h2m2 0h2m2 0h2M7 16h10",
    products: "M4 5h16v14H4V5Zm0 4h16M8 5v4m8-4v4",
    inventory: "m4 7 8-4 8 4-4 2-4-2-4 2-4-2Zm0 0v10l8 4 8-4V7M8 9v10m8-10v10",
    sales: "M5 4h14v16H5V4Zm3 4h8M8 12h8M8 16h5",
    reports: "M5 19V9m7 10V5m7 14v-7",
    users: "M16 20v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1m6-9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-7a3 3 0 0 1 0 6m2 7v-1a4 4 0 0 0-3-3",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    logout: "M10 5H5v14h5m5-4 4-3-4-3m4 3H9",
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={paths[name]} />
    </svg>
  );
}

function activeFor(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, collapsed = false, onNavigate }: { item: NavItem; collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeFor(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
        active ? "bg-emerald-600 text-white" : "text-zinc-400 hover:bg-white/10 hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <Icon name={ICONS[item.label]} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function UserBlock({ userName, role, collapsed = false, onLogout }: { userName: string; role: Role; collapsed?: boolean; onLogout: () => void }) {
  return (
    <div className={`border-t border-white/10 ${collapsed ? "px-2 py-4" : "p-4"}`}>
      {!collapsed && (
        <div className="mb-3 min-w-0">
          <div className="truncate text-sm font-semibold text-white">{userName}</div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{ROLE_LABELS[role]}</div>
        </div>
      )}
      <button
        type="button"
        onClick={onLogout}
        title={collapsed ? "Log out" : undefined}
        className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-left text-sm font-medium text-red-300 hover:bg-red-500/10 hover:text-red-200 ${
          collapsed ? "justify-center px-0" : "px-3"
        }`}
      >
        <Icon name="logout" />
        {!collapsed && "Log out"}
      </button>
    </div>
  );
}

export function NewLayout({ children, items, userName, role }: { children: React.ReactNode; items: NavItem[]; userName: string; role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const visibleTabs = MOBILE_TABS.map((label) => items.find((item) => item.label === label)).filter((item): item is NavItem => Boolean(item));
  const moreItems = items.filter((item) => !MOBILE_TABS.includes(item.label));
  const currentItem = items.find((item) => activeFor(pathname, item.href));
  const title = currentItem?.label ?? "RingUp";
  const moreActive = moreItems.some((item) => activeFor(pathname, item.href));

  async function logout() {
    if (!window.confirm("Log out of RingUp?")) return;
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-zinc-950 text-zinc-100 xl:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold">R</span>
          <span className="text-lg font-bold tracking-tight">RingUp</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary navigation">
          {items.map((item) => <NavLink key={item.href} item={item} />)}
        </nav>
        <UserBlock userName={userName} role={role} onLogout={logout} />
      </aside>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-16 flex-col bg-zinc-950 text-zinc-100 md:flex xl:hidden">
        <div className="flex h-20 items-center justify-center border-b border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold">R</span>
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label="Primary navigation">
          {items.map((item) => <NavLink key={item.href} item={item} collapsed />)}
        </nav>
        <UserBlock userName={userName} role={role} collapsed onLogout={logout} />
      </aside>

      <div className="min-h-screen pb-20 md:pl-16 xl:pl-64">
        <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 md:hidden">
          <div>
            <div className="text-lg font-bold tracking-tight">{title}</div>
            <div className="mt-0.5 text-xs text-zinc-500">RingUp POS</div>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{ROLE_LABELS[role]}</span>
        </header>
        <main className="min-w-0 overflow-x-hidden bg-zinc-50 px-4 py-5 sm:px-6 sm:py-7 xl:px-8 xl:py-8 dark:bg-zinc-950">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-900/95" aria-label="Mobile navigation">
        {visibleTabs.map((item) => {
          const active = activeFor(pathname, item.href);
          return (
            <Link key={item.href} href={item.href} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? "text-emerald-700" : "text-zinc-500"}`}>
              <Icon name={ICONS[item.label]} />
              {item.label}
            </Link>
          );
        })}
        <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${moreOpen || moreActive ? "text-emerald-700" : "text-zinc-500"}`}>
          <Icon name="more" />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="More navigation">
          <button type="button" aria-label="Close more navigation" onClick={() => setMoreOpen(false)} className="absolute inset-0 bg-zinc-950/45" />
          <section className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-zinc-200 bg-white px-5 pb-7 pt-3 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <div className="mb-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
              <div className="font-semibold">{userName}</div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">{ROLE_LABELS[role]}</div>
            </div>
            <nav className="space-y-1">
              {moreItems.map((item) => <NavLink key={item.href} item={item} onNavigate={() => setMoreOpen(false)} />)}
              <button type="button" onClick={logout} className="flex min-h-11 w-full items-center gap-3 border-t border-zinc-200 pt-3 text-left text-sm font-medium text-red-700 dark:border-zinc-800">
                <Icon name="logout" />
                Log out
              </button>
            </nav>
          </section>
        </div>
      )}
    </div>
  );
}
