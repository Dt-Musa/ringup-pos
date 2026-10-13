"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUGX } from "@/lib/format";
import { Icon } from "@/components/ui/icon";
import type { StockStatus } from "@/lib/inventory";
import { StockBadge } from "./stock-badge";
import { StockActionModal, type StockAction } from "./stock-action-modal";

export type InventoryRow = {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockQty: number;
  minStock: number;
  buyingCost: number;
  stockValue: number;
  status: StockStatus;
};

export function InventoryTable({ items }: { items: InventoryRow[] }) {
  const [modal, setModal] = useState<{ action: StockAction; product: InventoryRow } | null>(null);
  const btn = "inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:border-slate-500 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="inventory-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2 text-right">Min</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Unit cost</th>
              <th className="px-4 py-2 text-right">Stock value</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-zinc-500">
                  No products match your filters.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                <td data-label="Product" className="px-4 py-2 font-medium">{p.name}</td>
                <td data-label="SKU" className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td data-label="Category" className="px-4 py-2">{p.category}</td>
                <td data-label="Stock" className={`px-4 py-2 text-right font-semibold ${p.status === "OUT" ? "text-red-600" : p.status === "LOW" ? "text-amber-600" : ""}`}>{p.stockQty}</td>
                <td data-label="Minimum" className="px-4 py-2 text-right text-zinc-500">{p.minStock}</td>
                <td data-label="Status" className="px-4 py-2">
                  <StockBadge status={p.status} />
                </td>
                <td data-label="Unit cost" className="px-4 py-2 text-right">{formatUGX(p.buyingCost)}</td>
                <td data-label="Stock value" className="px-4 py-2 text-right">{formatUGX(p.stockValue)}</td>
                <td data-label="Actions" className="whitespace-nowrap px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setModal({ action: "ADD", product: p })} className={`${btn} text-emerald-700`}>
                      <Icon name="package-plus" /> Add
                    </button>
                    <button onClick={() => setModal({ action: "REDUCE", product: p })} className={`${btn} text-red-600`}>
                      <Icon name="package-minus" /> Reduce
                    </button>
                    <button onClick={() => setModal({ action: "ADJUST", product: p })} className={btn}>
                      <Icon name="sliders" /> Adjust
                    </button>
                    <Link href={`/inventory/history?productId=${p.id}`} className={btn}>
                      <Icon name="archive" /> History
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && <StockActionModal key={modal.action + modal.product.id} action={modal.action} product={modal.product} onClose={() => setModal(null)} />}
    </>
  );
}
