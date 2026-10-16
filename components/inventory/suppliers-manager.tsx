"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, inputCls } from "@/components/ui/modal";

type Supplier = { id: string; name: string; phone: string | null; email: string | null; address: string | null; _count: { purchaseOrders: number } };

export function SuppliersManager({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    const response = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, phone, email, address }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setError(data.error ?? "Could not save supplier"); return; }
    setName(""); setPhone(""); setEmail(""); setAddress("");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900">
        <input aria-label="Supplier name" placeholder="Supplier name *" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} mt-0`} />
        <input aria-label="Phone" placeholder="Phone" maxLength={40} value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputCls} mt-0`} />
        <input aria-label="Email" placeholder="Email" type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputCls} mt-0`} />
        <div className="flex gap-2"><input aria-label="Address" placeholder="Address" maxLength={300} value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputCls} mt-0`} /><button disabled={busy} className={btnPrimary}>{busy ? "Saving…" : "Add supplier"}</button></div>
        {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-4">{error}</p>}
      </form>
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm"><thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800"><tr><th className="px-4 py-3">Supplier</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Address</th><th className="px-4 py-3 text-right">Orders</th></tr></thead><tbody>
          {suppliers.map((supplier) => <tr key={supplier.id} className="border-t border-zinc-100 dark:border-zinc-800"><td className="px-4 py-3 font-medium">{supplier.name}</td><td className="px-4 py-3">{supplier.phone || "—"}<br /><span className="text-xs text-zinc-500">{supplier.email || ""}</span></td><td className="px-4 py-3">{supplier.address || "—"}</td><td className="px-4 py-3 text-right">{supplier._count.purchaseOrders}</td></tr>)}
          {suppliers.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-zinc-500">No suppliers yet. Add one to create a purchase order.</td></tr>}
        </tbody></table>
      </div>
    </div>
  );
}
