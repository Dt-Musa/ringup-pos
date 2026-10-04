"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import { formatUGX } from "@/lib/format";

export type StockAction = "ADD" | "REDUCE" | "ADJUST";
export type StockTarget = { id: string; name: string; sku: string; stockQty: number; buyingCost: number };

const REASONS: Record<Exclude<StockAction, "ADD">, string[]> = {
  REDUCE: ["Damaged", "Expired", "Lost / stolen", "Used internally", "Returned to supplier"],
  ADJUST: ["Stock count", "Found stock", "Correction"],
};

const TITLES: Record<StockAction, string> = { ADD: "Add stock", REDUCE: "Reduce stock", ADJUST: "Adjust stock (stock take)" };

export function StockActionModal({ action, product, onClose }: { action: StockAction; product: StockTarget; onClose: () => void }) {
  const router = useRouter();
  const [qty, setQty] = useState("");
  const [note, setNote] = useState(""); // ADD: optional note; REDUCE/ADJUST: required reason
  const [unitCost, setUnitCost] = useState("");
  const [updateCost, setUpdateCost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const n = qty.trim() === "" ? NaN : Number(qty);
  const preview = Number.isFinite(n) ? (action === "ADD" ? product.stockQty + n : action === "REDUCE" ? product.stockQty - n : n) : null;
  const previewBad = preview !== null && (preview < 0 || !Number.isInteger(preview));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});
    const reason = note.trim();
    if (action !== "ADD" && reason.length < 3) {
      setSaving(false);
      setFieldErrors({ reason: ["Please give a reason (at least 3 characters)"] });
      setError("A reason is required");
      return;
    }
    const num = (v: string) => (v.trim() === "" ? "" : Number(v)); // "" -> clear "must be a number" error from the API
    const body =
      action === "ADD"
        ? {
            action,
            productId: product.id,
            qty: num(qty),
            reason: reason || undefined,
            unitCost: unitCost.trim() === "" ? undefined : Number(unitCost),
            updateBuyingCost: updateCost && unitCost.trim() !== "" ? true : undefined,
          }
        : action === "REDUCE"
          ? { action, productId: product.id, qty: num(qty), reason }
          : { action, productId: product.id, countedQty: num(qty), reason };
    const res = await fetch("/api/inventory/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(data.error ?? "Could not update stock");
      setFieldErrors(data.fieldErrors ?? {});
      if (res.status === 409) router.refresh();
    }
  }

  const qtyKey = action === "ADJUST" ? "countedQty" : "qty";

  return (
    <Modal title={`${TITLES[action]} – ${product.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-800">
          <span>
            <span className="font-mono text-xs">{product.sku}</span> · current stock
          </span>
          <span className="text-lg font-semibold" data-testid="current-stock">
            {product.stockQty}
          </span>
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium">
          {action === "ADJUST" ? "Counted quantity (new stock level) *" : action === "ADD" ? "Quantity to add *" : "Quantity to remove *"}
          <input
            name="qty"
            type="number"
            inputMode="numeric"
            min={action === "ADJUST" ? 0 : 1}
            step={1}
            autoFocus
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className={inputCls}
          />
          {fieldErrors[qtyKey]?.[0] && <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors[qtyKey][0]}</span>}
          {preview !== null && (
            <span className={`mt-1 block text-xs font-normal ${previewBad ? "text-red-600" : "text-zinc-500"}`}>
              {previewBad ? (preview < 0 ? "Cannot go below 0 – only " + product.stockQty + " in stock" : "Must be a whole number") : `New stock level: ${preview}`}
            </span>
          )}
        </label>

        {action === "ADD" && (
          <>
            <label className="block text-sm font-medium">
              Unit cost (UGX) <span className="font-normal text-zinc-500">– optional, current {formatUGX(product.buyingCost)}</span>
              <input name="unitCost" type="number" inputMode="numeric" min={0} step={1} value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className={inputCls} />
              {fieldErrors.unitCost?.[0] && <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.unitCost[0]}</span>}
            </label>
            {unitCost.trim() !== "" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} />
                Also update the product&apos;s buying cost to {formatUGX(Number(unitCost) || 0)}
              </label>
            )}
          </>
        )}

        {action === "ADD" ? (
          <label className="block text-sm font-medium">
            Note / supplier (optional)
            <input name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={inputCls} />
            {fieldErrors.reason?.[0] && <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.reason[0]}</span>}
          </label>
        ) : (
          <label className="block text-sm font-medium">
            Reason (required)
            <input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              required
              list={`reasons-${action}`}
              placeholder={action === "REDUCE" ? "e.g. Damaged, Expired, Lost" : "e.g. Stock count"}
              className={inputCls}
            />
            <datalist id={`reasons-${action}`}>
              {REASONS[action].map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {fieldErrors.reason?.[0] && <span className="mt-1 block text-xs font-normal text-red-600">{fieldErrors.reason[0]}</span>}
          </label>
        )}

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving || previewBad} className={btnPrimary}>
            {saving ? "Saving…" : action === "ADD" ? "Add stock" : action === "REDUCE" ? "Remove stock" : "Set stock level"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
