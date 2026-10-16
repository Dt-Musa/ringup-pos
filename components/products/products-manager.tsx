"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatUGX } from "@/lib/format";
import { CategoryManagerModal } from "./category-manager-modal";
import { ProductFormModal } from "./product-form-modal";
import type { CategoryOption, ProductRow } from "./types";

type ModalState = null | { kind: "product"; product?: ProductRow } | { kind: "categories" };

export function ProductsManager({ products, categories }: { products: ProductRow[]; categories: CategoryOption[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deactivateProduct, setDeactivateProduct] = useState<ProductRow | null>(null);

  async function toggleActive(p: ProductRow) {
    setBusyId(p.id);
    setError(null);
    const res = await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    setBusyId(null);
    if (res.ok) {
      setDeactivateProduct(null);
      router.refresh();
    }
    else setError((await res.json().catch(() => ({}))).error ?? "Could not update the product");
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={() => setModal({ kind: "categories" })} className={btnSecondary}>
          <Icon name="sliders" /> Manage categories
        </button>
        <button onClick={() => setModal({ kind: "product" })} className={btnPrimary}>
          <Icon name="plus" /> Add product
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="products-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Stock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No products match your filters.
                </td>
              </tr>
            )}
            {products.map((p) => {
              const out = p.stockQty <= 0;
              const low = !out && p.stockQty <= p.minStock;
              return (
                <tr key={p.id} className={`border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40 ${p.active ? "" : "opacity-60"}`}>
                  <td data-label="Product" className="px-4 py-2 sm:min-w-56">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-zinc-100 text-xs text-zinc-400 dark:bg-zinc-800">
                        {p.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="h-full w-full object-contain" />
                        ) : (
                          p.name.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                  </td>
                  <td data-label="SKU" className="px-4 py-2 font-mono text-xs">
                    <div>{p.sku}</div>
                    {p.barcode && <div className="text-[11px] text-zinc-400 dark:text-zinc-500">#{p.barcode}</div>}
                  </td>
                  <td data-label="Category" className="px-4 py-2">{p.categoryName}</td>
                  <td data-label="Cost" className="px-4 py-2 text-right">{formatUGX(p.buyingCost)}</td>
                  <td data-label="Price" className="px-4 py-2 text-right font-semibold text-emerald-800">{formatUGX(p.sellingPrice)}</td>
                  <td data-label="Stock" className="px-4 py-2 text-right font-semibold">
                    <span className={out ? "text-red-600" : low ? "text-amber-600" : "text-zinc-800"}>{p.stockQty}</span>
                    {out && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">Out</span>}
                    {low && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Low</span>}
                  </td>
                  <td data-label="Status" className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td data-label="Actions" className="whitespace-nowrap px-4 py-2 text-right">
                    <button onClick={() => setModal({ kind: "product", product: p })} className="mr-3 inline-flex min-h-10 items-center font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950">
                      <Icon name="edit" /> Edit
                    </button>
                    <button
                      onClick={() => p.active ? setDeactivateProduct(p) : void toggleActive(p)}
                      disabled={busyId === p.id}
                      className={`${p.active ? "text-red-700" : "text-emerald-800"} inline-flex min-h-10 items-center font-semibold underline decoration-current/30 underline-offset-2 hover:decoration-current disabled:opacity-50`}
                    >
                      {p.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal?.kind === "product" && (
        <ProductFormModal key={modal.product?.id ?? "new"} product={modal.product} categories={categories} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "categories" && <CategoryManagerModal categories={categories} onClose={() => setModal(null)} />}
      {deactivateProduct && (
        <ConfirmModal
          title={`Deactivate ${deactivateProduct.name}?`}
          confirmLabel="Deactivate"
          danger
          busy={busyId === deactivateProduct.id}
          error={error}
          onConfirm={() => void toggleActive(deactivateProduct)}
          onClose={() => setDeactivateProduct(null)}
        >
          It will be hidden from the POS but its history will be kept.
        </ConfirmModal>
      )}
    </>
  );
}
