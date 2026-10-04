"use client";

import Link from "next/link";
import { useState } from "react";
import { formatUGX } from "@/lib/format";
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
  const btn = "rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800";
  return (
    <>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
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
              <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2">{p.category}</td>
                <td className={`px-4 py-2 text-right font-semibold ${p.status === "OUT" ? "text-red-600" : p.status === "LOW" ? "text-amber-600" : ""}`}>{p.stockQty}</td>
                <td className="px-4 py-2 text-right text-zinc-500">{p.minStock}</td>
                <td className="px-4 py-2">
                  <StockBadge status={p.status} />
                </td>
                <td className="px-4 py-2 text-right">{formatUGX(p.buyingCost)}</td>
                <td className="px-4 py-2 text-right">{formatUGX(p.stockValue)}</td>
                <td className="whitespace-nowrap px-4 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <button onClick={() => setModal({ action: "ADD", product: p })} className={`${btn} text-emerald-700`}>
                      Add
                    </button>
                    <button onClick={() => setModal({ action: "REDUCE", product: p })} className={`${btn} text-red-600`}>
                      Reduce
                    </button>
                    <button onClick={() => setModal({ action: "ADJUST", product: p })} className={btn}>
                      Adjust
                    </button>
                    <Link href={`/inventory/history?productId=${p.id}`} className={btn}>
                      History
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
