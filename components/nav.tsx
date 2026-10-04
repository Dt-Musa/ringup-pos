"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavItem } from "@/lib/permissions";

export function Sidebar({ items, userName, role }: { items: NavItem[]; userName: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col bg-zinc-900 text-zinc-100">
      <div className="px-5 py-5 text-lg font-semibold">RingUp</div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${active ? "bg-emerald-600 text-white" : "text-zinc-300 hover:bg-zinc-800"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-zinc-800 p-4 pb-16 text-sm">
        <div className="font-medium">{userName}</div>
        <div className="text-xs uppercase tracking-wide text-zinc-400">{role}</div>
        <button onClick={logout} className="mt-3 w-full rounded-md bg-zinc-800 px-3 py-2 text-left hover:bg-zinc-700">
          Sign out
        </button>
      </div>
    </aside>
  );
}
