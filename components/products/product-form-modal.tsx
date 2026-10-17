"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import { formatUGX } from "@/lib/format";
import type { CategoryOption, ProductRow } from "./types";

type FieldErrors = Record<string, string[]>;

function Field({ label, error, children, hint }: { label: string; error?: string[]; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
      {hint && !error && <span className="mt-1 block text-xs font-normal text-zinc-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-normal text-red-600">{error[0]}</span>}
    </label>
  );
}

export function ProductFormModal({
  product,
  categories,
  onClose,
}: {
  product?: ProductRow; // undefined = create
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const editing = !!product;
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [barcode, setBarcode] = useState(product?.barcode ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [buyingCost, setBuyingCost] = useState(String(product?.buyingCost ?? ""));
  const [sellingPrice, setSellingPrice] = useState(String(product?.sellingPrice ?? ""));
  const [stockQty, setStockQty] = useState(String(product?.stockQty ?? "0"));
  const [minStock, setMinStock] = useState(String(product?.minStock ?? "0"));
  const [active, setActive] = useState(product?.active ?? true);
  const [image, setImage] = useState<string | null>(product?.image ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const submitInFlight = useRef(false);

  const cost = Number(buyingCost);
  const price = Number(sellingPrice);
  const margin = buyingCost !== "" && sellingPrice !== "" && price > 0 && Number.isFinite(cost) ? ((price - cost) / price) * 100 : null;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setFieldErrors((f) => ({ ...f, image: [] }));
    if (file.size > 2 * 1024 * 1024) {
      setFieldErrors((f) => ({ ...f, image: ["Image is too large (max 2 MB)"] }));
      return;
    }
    if (!( ["image/jpeg", "image/png", "image/webp", "image/gif"] as string[]).includes(file.type)) {
      setFieldErrors((f) => ({ ...f, image: ["Unsupported file type. Use a JPG, PNG, WebP or GIF image"] }));
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.path === "string") setImage(data.path);
      else setFieldErrors((f) => ({ ...f, image: [data.error ?? "The image could not be uploaded. Please try again."] }));
    } catch {
      setFieldErrors((f) => ({ ...f, image: ["The image could not be uploaded. Check your connection and try again."] }));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitInFlight.current || uploading) return;
    submitInFlight.current = true;
    setError(null);
    setFieldErrors({});
    setSaving(true);
    const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
    const body = {
      name,
      sku,
      barcode: barcode.trim() === "" ? null : barcode.trim(),
      categoryId,
      buyingCost: num(buyingCost),
      sellingPrice: num(sellingPrice),
      stockQty: num(stockQty),
      minStock: num(minStock),
      image,
      active,
    };
    // NaN would serialise to null; send undefined-like invalid marker so the API reports a clear error
    const payload = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === "number" && Number.isNaN(v) ? "" : v]));
    // Don't overwrite stock that may have changed (e.g. a sale) unless the user actually edited it.
    if (editing && body.stockQty === product.stockQty) delete (payload as Record<string, unknown>).stockQty;
    try {
      const res = await fetch(editing ? `/api/products/${product.id}` : "/api/products", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        setError(data.error ?? "Could not save the product");
        setFieldErrors(data.fieldErrors ?? {});
      }
    } catch {
      setError("Could not confirm the save. Check the product list by SKU before retrying.");
    } finally {
      submitInFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? `Edit ${product.name}` : "Add product"} onClose={onClose} wide>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" error={fieldErrors.name}>
            <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={100} required />
          </Field>
          <Field label="SKU / code *" error={fieldErrors.sku} hint="Unique. Letters, numbers, . - _">
            <input name="sku" value={sku} onChange={(e) => setSku(e.target.value.toUpperCase())} className={`${inputCls} font-mono`} maxLength={32} required />
          </Field>
          <Field label="Barcode" error={fieldErrors.barcode} hint="Optional. Unique barcode (UPC/EAN/Code128)">
            <input name="barcode" value={barcode} onChange={(e) => setBarcode(e.target.value.trim())} className={`${inputCls} font-mono`} maxLength={48} placeholder="e.g. 6001001001" />
          </Field>
          <Field label="Category *" error={fieldErrors.categoryId}>
            <select name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls} required>
              {categories.length === 0 && <option value="">No categories – add one first</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="active"
              value={active ? "1" : "0"}
              onChange={(e) => setActive(e.target.value === "1")}
              className={inputCls}
            >
              <option value="1">Active</option>
              <option value="0">Inactive (hidden from POS)</option>
            </select>
          </Field>
          <Field label="Buying cost (UGX) *" error={fieldErrors.buyingCost}>
            <input name="buyingCost" type="number" inputMode="numeric" min={0} step={1} value={buyingCost} onChange={(e) => setBuyingCost(e.target.value)} className={inputCls} required />
          </Field>
          <Field label="Selling price (UGX) *" error={fieldErrors.sellingPrice} hint={margin !== null ? `Margin ${margin.toFixed(0)}% · profit ${formatUGX(price - cost)} per unit${price < cost ? " ⚠ selling below cost" : ""}` : undefined}>
            <input name="sellingPrice" type="number" inputMode="numeric" min={0} step={1} value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className={inputCls} required />
          </Field>
          <Field
            label={editing ? "Stock quantity" : "Initial stock quantity"}
            error={fieldErrors.stockQty}
            hint={editing ? "Changing this records a stock ADJUSTMENT" : "Recorded as an opening stock movement"}
          >
            <input name="stockQty" type="number" inputMode="numeric" min={0} step={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Minimum stock (alert level)" error={fieldErrors.minStock}>
            <input name="minStock" type="number" inputMode="numeric" min={0} step={1} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div>
          <div className="text-sm font-medium">Image</div>
          <div className="mt-2 flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Product" className="h-full w-full object-contain" />
              ) : (
                "No image"
              )}
            </div>
            <div className="space-y-2 text-sm">
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFile}
                disabled={uploading}
                className="block text-xs file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm hover:file:bg-zinc-200 dark:file:bg-zinc-800"
              />
              <p className="text-xs text-zinc-500">JPG, PNG, WebP or GIF, up to 2 MB.</p>
              {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
              {image && (
                <button type="button" onClick={() => setImage(null)} className="text-xs text-red-600 hover:underline">
                  Remove image
                </button>
              )}
              {fieldErrors.image?.[0] && <p className="text-xs text-red-600">{fieldErrors.image[0]}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving || uploading} className={btnPrimary}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add product"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
