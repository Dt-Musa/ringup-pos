"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import { formatUGX } from "@/lib/format";
import { refundAmount } from "@/lib/refund-math";

export type RefundableItem = { id: string; name: string; sku: string; unitPrice: number; qty: number; refundedQty: number };
export type RefundSaleInfo = { id: string; receiptNo: string; subtotal: number; total: number; refundedAmount: number; items: RefundableItem[] };

const METHODS = ["Cash", "Mobile Money", "Card reversal", "Bank transfer", "Store credit"];

export function RefundModal({ sale, onClose }: { sale: RefundSaleInfo; onClose: () => void }) {
  const router = useRouter();
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const rows = sale.items.map((i) => ({ ...i, remaining: i.qty - i.refundedQty }));
  const chosen = rows.map((r) => {
    const n = Number(qtys[r.id] || 0);
    return { ...r, n: Number.isInteger(n) && n >= 0 ? n : NaN };
  });
  const invalid = chosen.some((c) => Number.isNaN(c.n) || c.n > c.remaining);
  const lines = chosen.filter((c) => c.n > 0);
  const grossBefore = rows.reduce((s, r) => s + r.refundedQty * r.unitPrice, 0);
  const grossLines = lines.reduce((s, l) => s + l.n * l.unitPrice, 0);
  const estimate = refundAmount({ subtotal: sale.subtotal, total: sale.total, grossBefore, grossAfter: grossBefore + grossLines, alreadyRefunded: sale.refundedAmount });

  function fillAll() {
    setQtys(Object.fromEntries(rows.filter((r) => r.remaining > 0).map((r) => [r.id, String(r.remaining)])));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (lines.length === 0) return setError("Choose at least one item and quantity to refund");
    if (reason.trim().length < 3) {
      setFieldErrors({ reason: ["Please give a reason (at least 3 characters)"] });
      return setError("A reason is required");
    }
    setSaving(true);
    const res = await fetch("/api/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        saleId: sale.id,
        items: lines.map((l) => ({ saleItemId: l.id, qty: l.n, restock: restock[l.id] ?? true })),
        reason: reason.trim(),
        method: method.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(data.error ?? "Could not process the refund");
      setFieldErrors(data.fieldErrors ?? {});
      if (res.status === 409) router.refresh();
    }
  }

  return (
    <Modal title={`Refund ${sale.receiptNo}`} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">Choose the quantity of each item being returned.</p>
          <button type="button" onClick={fillAll} className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Refund full sale
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm" data-testid="refund-items">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
              <tr>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Sold</th>
                <th className="px-3 py-2 text-right">Refundable</th>
                <th className="px-3 py-2 text-right">Return qty</th>
                <th className="px-3 py-2 text-center">Restock</th>
              </tr>
            </thead>
            <tbody>
              {chosen.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500">{formatUGX(r.unitPrice)} each</div>
                  </td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right">{r.remaining}</td>
                  <td className="px-3 py-2 text-right">
                    <input
                      type="number"
                      min={0}
                      max={r.remaining}
                      step={1}
                      disabled={r.remaining === 0}
                      value={qtys[r.id] ?? ""}
                      placeholder="0"
                      onChange={(e) => setQtys((q) => ({ ...q, [r.id]: e.target.value }))}
                      aria-label={`Return quantity for ${r.name}`}
                      className={`${inputCls.replace("w-full", "w-20")} mt-0 text-right ${Number.isNaN(r.n) || r.n > r.remaining ? "border-red-500" : ""}`}
                    />
                    {r.n > r.remaining && <div className="mt-1 text-xs text-red-600">Max {r.remaining}</div>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={restock[r.id] ?? true}
                      onChange={(e) => setRestock((s) => ({ ...s, [r.id]: e.target.checked }))}
                      aria-label={`Return ${r.name} to stock`}
                      disabled={r.remaining === 0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {fieldErrors.items?.[0] && <p className="text-xs text-red-600">{fieldErrors.items[0]}</p>}
        <p className="text-xs text-zinc-500">Untick &ldquo;Restock&rdquo; for damaged goods that should not go back on the shelf.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Reason (required)
            <input name="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} list="refund-reasons" placeholder="e.g. Wrong item, Damaged, Customer changed mind" className={inputCls} />
            <datalist id="refund-reasons">
              {["Wrong item", "Damaged / faulty", "Customer changed mind", "Overcharged", "Expired"].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {fieldErrors.reason?.[0] && <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.reason[0]}</span>}
          </label>
          <label className="block text-sm font-medium">
            Refund method (note)
            <input name="method" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={100} list="refund-methods" placeholder="How the money was returned" className={inputCls} />
            <datalist id="refund-methods">
              {METHODS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </label>
        </div>

        <div className="flex items-center justify-between rounded-md bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
          <span className="text-sm text-zinc-600 dark:text-zinc-300">Refund amount{sale.total !== sale.subtotal ? " (discount-adjusted)" : ""}</span>
          <span className="text-xl font-bold" data-testid="refund-estimate">
            {formatUGX(invalid ? 0 : estimate)}
          </span>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving || invalid || lines.length === 0} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            {saving ? "Processing…" : `Refund ${formatUGX(invalid ? 0 : estimate)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
