"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { NavItem } from "@/lib/permissions";

export function Sidebar({ items, userName, role }: { items: NavItem[]; userName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="relative z-20 w-full shrink-0 bg-zinc-950 text-zinc-100 lg:w-64">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5 lg:block lg:border-0 lg:py-6">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold shadow-lg shadow-emerald-950/30">R</span>
          <span className="text-lg font-bold tracking-tight">RingUp</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls="primary-navigation"
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden"
        >
          <span className="text-xl leading-none">{open ? "×" : "☰"}</span>
        </button>
      </div>
      <div id="primary-navigation" className={`${open ? "block" : "hidden"} absolute left-0 right-0 border-b border-white/10 bg-zinc-950 px-3 pb-3 shadow-xl lg:static lg:block lg:border-0 lg:px-3 lg:pb-0 lg:shadow-none`}>
      <nav className="space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
        <div className="mt-6 border-t border-white/10 p-4 pb-6 text-sm lg:mt-8">
        <div className="font-medium">{userName}</div>
          <div className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{role}</div>
          <button onClick={logout} className="mt-4 min-h-10 w-full rounded-lg bg-white/10 px-3 py-2 text-left text-zinc-300 hover:bg-white/15 hover:text-white">
          Sign out
        </button>
      </div>
        </div>
    </aside>
  );
}
