"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls } from "@/components/ui/modal";
import { formatDateTime, formatUGX } from "@/lib/format";

type Supplier = { id: string; name: string };
type Product = { id: string; name: string; sku: string };
type Order = {
  id: string; poNumber: string; status: "DRAFT" | "ORDERED" | "RECEIVED" | "CANCELLED"; total: number; notes: string | null;
  createdAt: string; receivedAt: string | null; invoiceNumber: string | null; invoiceDate: string | null; invoiceAmount: number | null;
  supplier: { id: string; name: string }; createdBy: { name: string };
  items: { id: string; qty: number; unitCost: number; product: Product }[];
};
type Line = { productId: string; qty: string; unitCost: string };

const statuses = { DRAFT: "Draft", ORDERED: "Ordered", RECEIVED: "Received", CANCELLED: "Cancelled" };

export function PurchasesManager({ suppliers, products, orders }: { suppliers: Supplier[]; products: Product[]; orders: Order[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ productId: products[0]?.id ?? "", qty: "1", unitCost: "0" }]);
  const [receiveId, setReceiveId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, key: keyof Line, value: string) {
    setLines((current) => current.map((line, i) => i === index ? { ...line, [key]: value } : line));
  }

  async function createOrder(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supplierId, notes, items: lines.map((line) => ({ productId: line.productId, qty: Number(line.qty), unitCost: Number(line.unitCost) })) }) });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(data.error ?? "Could not create purchase order"); return; }
    setNotes(""); setLines([{ productId: products[0]?.id ?? "", qty: "1", unitCost: "0" }]); router.refresh();
  }

  async function transition(id: string, body: object) {
    setBusy(true); setError(null);
    const response = await fetch(`/api/purchases/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({})); setBusy(false);
    if (!response.ok) { setError(data.error ?? "Could not update purchase order"); return false; }
    setReceiveId(null); setCancelId(null); setInvoiceNumber(""); setInvoiceAmount(""); router.refresh(); return true;
  }

  async function receive(event: React.FormEvent) {
    event.preventDefault();
    if (receiveId) await transition(receiveId, { action: "RECEIVE", invoiceNumber, invoiceDate, invoiceAmount: Number(invoiceAmount) });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createOrder} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div><h2 className="text-lg font-semibold">New purchase order</h2><p className="text-sm text-zinc-500">Create a draft, mark it ordered, then record its supplier invoice when all items arrive.</p></div>
        {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Supplier<select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}><option value="">Choose supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm font-medium">Notes<input maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></label></div>
        {lines.map((line, index) => <div key={index} className="grid items-end gap-2 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]"><label className="text-sm font-medium">Product<select required value={line.productId} onChange={(e) => updateLine(index, "productId", e.target.value)} className={inputCls}><option value="">Choose product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}</select></label><label className="text-sm font-medium">Quantity<input type="number" min="1" max="10000000" required value={line.qty} onChange={(e) => updateLine(index, "qty", e.target.value)} className={inputCls} /></label><label className="text-sm font-medium">Unit cost (UGX)<input type="number" min="0" max="1000000000" required value={line.unitCost} onChange={(e) => updateLine(index, "unitCost", e.target.value)} className={inputCls} /></label><button type="button" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="min-h-11 px-3 text-sm text-red-700 disabled:opacity-40">Remove</button></div>)}
        <div className="flex flex-wrap gap-2"><button type="button" disabled={lines.length >= 100 || products.length === 0} onClick={() => setLines((current) => [...current, { productId: products[0]?.id ?? "", qty: "1", unitCost: "0" }])} className={btnSecondary}>Add item</button><button disabled={busy || suppliers.length === 0 || products.length === 0} className={btnPrimary}>{busy ? "Saving…" : "Save draft"}</button>{suppliers.length === 0 && <span className="self-center text-sm text-amber-700">Add a supplier first.</span>}{products.length === 0 && <span className="self-center text-sm text-amber-700">Add an active product first.</span>}</div>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Purchase orders</h2>
        {orders.map((order) => <article key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-semibold">{order.poNumber} <span className="ml-2 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium dark:bg-zinc-800">{statuses[order.status]}</span></div><div className="mt-1 text-sm text-zinc-500">{order.supplier.name} · Created {formatDateTime(new Date(order.createdAt))} by {order.createdBy.name}</div>{order.invoiceNumber && <div className="mt-1 text-sm text-zinc-600">Invoice {order.invoiceNumber}{order.invoiceDate ? ` · ${order.invoiceDate.slice(0, 10)}` : ""}{order.invoiceAmount !== null ? ` · ${formatUGX(order.invoiceAmount)}` : ""}</div>}</div><div className="text-right font-semibold">{formatUGX(order.total)}</div></div>
          <ul className="my-3 divide-y divide-zinc-100 border-y border-zinc-100 text-sm dark:divide-zinc-800 dark:border-zinc-800">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-3 py-2"><span>{item.product.name} ({item.product.sku}) × {item.qty}</span><span>{formatUGX(item.qty * item.unitCost)}</span></li>)}</ul>
          {order.notes && <p className="mb-3 text-sm text-zinc-600">{order.notes}</p>}
          {receiveId === order.id && order.status === "ORDERED" && <form onSubmit={receive} className="mb-3 grid gap-3 rounded-lg bg-zinc-50 p-3 sm:grid-cols-2 lg:grid-cols-4 dark:bg-zinc-800"><label className="text-sm">Supplier invoice number<input required maxLength={100} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className={inputCls} /></label><label className="text-sm">Invoice date<input type="date" required value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={inputCls} /></label><label className="text-sm">Invoice amount (UGX)<input type="number" min="0" max="2000000000" required value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} className={inputCls} /></label><div className="flex gap-2 self-end"><button disabled={busy} className={btnPrimary}>{busy ? "Receiving…" : "Confirm receipt"}</button><button type="button" onClick={() => setReceiveId(null)} className={btnSecondary}>Cancel</button></div></form>}
          {cancelId === order.id && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/30"><p>Cancel this purchase order? This cannot be undone and will not change stock.</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void transition(order.id, { action: "CANCEL" })} className="min-h-10 rounded-lg bg-red-700 px-3 font-semibold text-white hover:bg-red-800 disabled:opacity-50">Confirm cancellation</button><button type="button" disabled={busy} onClick={() => setCancelId(null)} className={btnSecondary}>Keep order</button></div></div>}
          <div className="flex flex-wrap gap-2">{order.status === "DRAFT" && <button disabled={busy} onClick={() => void transition(order.id, { action: "ORDER" })} className={btnSecondary}>Mark ordered</button>}{order.status === "ORDERED" && <button disabled={busy} onClick={() => { setReceiveId(order.id); setCancelId(null); setInvoiceNumber(""); setInvoiceAmount(String(order.total)); setError(null); }} className={btnPrimary}>Receive items</button>}{(order.status === "DRAFT" || order.status === "ORDERED") && <button disabled={busy} onClick={() => { setReceiveId(null); setCancelId(order.id); setError(null); }} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">Cancel order</button>}{order.receivedAt && <span className="self-center text-sm text-emerald-700">Received {formatDateTime(new Date(order.receivedAt))}; stock updated.</span>}</div>
        </article>)}
        {orders.length === 0 && <p className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">No purchase orders yet.</p>}
      </div>
    </div>
  );
}
