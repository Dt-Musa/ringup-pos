"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Receipt, toReceiptSale, type ReceiptSale } from "@/components/receipt";
import { Modal } from "@/components/ui/modal";
import { formatUGX, PAYMENT_LABELS } from "@/lib/format";
import type { PosCategory, PosProduct } from "./types";

type Method = "CASH" | "MOBILE_MONEY" | "CARD" | "BANK_TRANSFER";
const METHODS: Method[] = ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"];
const QUICK_CASH = [5000, 10000, 20000, 50000];

type Done = { receipt: ReceiptSale; saleId: string; change: number };

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-[26px] w-[26px]">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 8H6" />
      <circle cx="10" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

export function PosScreen({ products, categories }: { products: PosProduct[]; categories: PosCategory[] }) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [cart, setCart] = useState<{ productId: string; qty: number }[]>([]);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, setDiscountValue] = useState("");
  const [method, setMethod] = useState<Method>("CASH");
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [clearUndo, setClearUndo] = useState<{ cart: typeof cart; discountType: typeof discountType; discountValue: string } | null>(null);
  const clearUndoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ringup:cart-state", { detail: { hasItems: cart.length > 0 } }));
    return () => {
      window.dispatchEvent(new CustomEvent("ringup:cart-state", { detail: { hasItems: false } }));
    };
  }, [cart.length]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) => (!categoryId || p.categoryId === categoryId) && (!q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    );
  }, [products, query, categoryId]);

  // ---- cart ----
  const lines = cart.map((c) => {
    const p = byId.get(c.productId);
    let problem: string | null = null;
    if (!p) problem = "No longer available";
    else if (p.stockQty <= 0) problem = "Out of stock";
    else if (c.qty > p.stockQty) problem = `Only ${p.stockQty} in stock`;
    return { ...c, product: p, problem, lineTotal: p ? p.sellingPrice * c.qty : 0 };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  const dv = discountValue.trim() === "" ? 0 : Number(discountValue);
  let discountError: string | null = null;
  if (!Number.isFinite(dv) || !Number.isInteger(dv) || dv < 0) discountError = "Enter a whole number of 0 or more";
  else if (discountType === "PERCENT" && dv > 100) discountError = "Percentage cannot exceed 100%";
  else if (discountType === "FIXED" && dv > subtotal) discountError = "Discount cannot exceed the subtotal";
  const discount = discountError ? 0 : discountType === "PERCENT" ? Math.round((subtotal * dv) / 100) : dv;
  const total = subtotal - discount;

  const tenderedNum = tendered.trim() === "" ? NaN : Number(tendered);
  const change = method === "CASH" && Number.isFinite(tenderedNum) ? tenderedNum - total : null;
  const cashShort = method === "CASH" && (change === null || change < 0);

  const hasProblem = lines.some((l) => l.problem);
  const canComplete = cart.length > 0 && !hasProblem && !discountError && !cashShort && !submitting;

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2500);
  }

  function add(p: PosProduct) {
    if (p.stockQty <= 0) return;
    setError(null);
    setCart((c) => {
      const existing = c.find((x) => x.productId === p.id);
      if (!existing) return [...c, { productId: p.id, qty: 1 }];
      if (existing.qty >= p.stockQty) {
        flash(`Only ${p.stockQty} of "${p.name}" in stock`);
        return c;
      }
      return c.map((x) => (x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
    });
  }

  function setQty(productId: string, raw: number) {
    const p = byId.get(productId);
    let qty = Math.max(1, Math.floor(Number.isFinite(raw) ? raw : 1));
    if (p && qty > p.stockQty) {
      qty = Math.max(1, p.stockQty);
      flash(`Only ${p.stockQty} of "${p.name}" in stock`);
    }
    setCart((c) => c.map((x) => (x.productId === productId ? { ...x, qty } : x)));
  }

  function remove(productId: string) {
    if (cart.length === 1) setMobileCartOpen(false);
    setCart((c) => c.filter((x) => x.productId !== productId));
  }

  function resetSale() {
    setCart([]);
    setMobileCartOpen(false);
    setDiscountValue("");
    setDiscountType("FIXED");
    setTendered("");
    setReference("");
    setMethod("CASH");
    setError(null);
  }

  function clearCart() {
    if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
    setClearUndo({ cart: [...cart], discountType, discountValue });
    resetSale();
    clearUndoTimer.current = setTimeout(() => setClearUndo(null), 5000);
  }

  function undoClearCart() {
    if (!clearUndo) return;
    if (clearUndoTimer.current) clearTimeout(clearUndoTimer.current);
    setCart(clearUndo.cart);
    setDiscountType(clearUndo.discountType);
    setDiscountValue(clearUndo.discountValue);
    setClearUndo(null);
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const exact = filtered.find((p) => p.sku.toLowerCase() === q);
    const target = exact ?? (filtered.length === 1 ? filtered[0] : undefined);
    if (target) {
      add(target);
      setQuery("");
    }
  }

  async function complete() {
    if (!canComplete) return;
    setSubmitting(true);
    setError(null);
    const body = {
      items: cart.map((c) => ({ productId: c.productId, qty: c.qty })),
      discount: dv > 0 ? { type: discountType, value: dv } : undefined,
      paymentMethod: method,
      amountTendered: method === "CASH" ? tenderedNum : undefined,
      paymentReference: method !== "CASH" && reference.trim() ? reference.trim() : undefined,
    };
    try {
      const res = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setDone({ receipt: toReceiptSale(data.sale), saleId: data.sale.id, change: data.change });
        resetSale();
        router.refresh(); // reload stock levels
      } else {
        setError(data.error ?? "Could not complete the sale");
        if (res.status === 409 || res.status === 404) router.refresh(); // stock/price changed – refresh the catalogue
      }
    } catch {
      setError("Network error – the sale was not completed. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function closeDone() {
    setDone(null);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  const inCart = (id: string) => cart.find((c) => c.productId === id)?.qty ?? 0;

  return (
    <div className="grid min-w-0 gap-5 pb-16 md:grid-cols-[minmax(0,1fr)_360px] md:gap-5 md:pb-0 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-6">
      {/* ---------- catalogue ---------- */}
      <section className="min-w-0">
        <input
          ref={searchRef}
          autoFocus
          type="search"
          name="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onSearchKey}
          placeholder="Search by name or scan / type SKU, then Enter…"
          aria-label="Search products"
          className="w-full rounded-lg border border-slate-400 bg-white px-4 py-3 text-base text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        />
        <div className="mt-3 flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Categories">
          {[{ id: "", name: "All" }, ...categories].map((c) => (
            <button
              key={c.id || "all"}
              role="tab"
              aria-selected={categoryId === c.id}
              onClick={() => setCategoryId(c.id)}
              className={`min-h-10 rounded-full px-3 py-1.5 text-sm ${
                categoryId === c.id ? "bg-emerald-600 text-white" : "bg-white text-zinc-700 shadow-sm hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-200"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No products match &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="mt-4 min-w-0 grid grid-cols-2 gap-2.5 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:grid-cols-3 sm:gap-3 lg:pb-0 xl:grid-cols-4" data-testid="product-grid">
            {filtered.map((p) => {
              const out = p.stockQty <= 0;
              const low = !out && p.stockQty <= p.minStock;
              const qty = inCart(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={out}
                  onClick={() => add(p)}
                  data-sku={p.sku}
                  className={`relative flex min-h-10 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-3 max-sm:p-2 text-left shadow-sm transition dark:border-zinc-800 dark:bg-zinc-900 ${
                    out ? "cursor-not-allowed opacity-50" : "hover:ring-2 hover:ring-emerald-500 active:scale-[0.98]"
                  } ${qty > 0 ? "ring-2 ring-emerald-600" : ""}`}
                >
                  <div className="mb-2 flex h-20 items-center justify-center overflow-hidden rounded bg-zinc-100 text-2xl font-semibold text-zinc-400 max-sm:mb-1 max-sm:h-12 max-sm:text-lg dark:bg-zinc-800">
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      p.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div className="line-clamp-2 min-h-[2.5rem] text-sm font-medium max-sm:min-h-[2rem] max-sm:text-xs">{p.name}</div>
                  <div className="mt-1 text-sm font-semibold text-emerald-700 max-sm:mt-0.5 max-sm:text-xs dark:text-emerald-400">{formatUGX(p.sellingPrice)}</div>
                  <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 max-sm:mt-0.5 max-sm:text-[10px]">
                    <span className="font-mono">{p.sku}</span>
                    <span className={out ? "font-semibold text-red-600" : low ? "font-semibold text-amber-600" : ""}>
                      {out ? "Out of stock" : `${p.stockQty} left`}
                    </span>
                  </div>
                  {qty > 0 && (
                    <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold text-white">
                      {qty}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------- cart ---------- */}
      <aside
        className={`${
          mobileCartOpen
            ? "fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-2xl px-4 pb-[env(safe-area-inset-bottom)]"
            : "hidden"
        } lg:sticky lg:top-4 lg:block lg:self-start lg:overflow-visible lg:rounded-none lg:px-0`}
      >
        <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 sm:px-5 dark:border-zinc-800">
            <h2 className="font-semibold">Current sale</h2>
            <div className="flex items-center gap-3">
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-sm text-red-600 hover:underline">
                  Clear
                </button>
              )}
              <button type="button" onClick={() => setMobileCartOpen(false)} aria-label="Close cart" className="text-xl leading-none text-zinc-400 hover:text-zinc-700 lg:hidden">
                ×
              </button>
            </div>
          </div>

          <div className="max-h-[35vh] overflow-y-auto sm:max-h-[320px]" data-testid="cart">
            {lines.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">Your cart is empty. Tap a product to add it.</p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {lines.map((l) => (
                  <li key={l.productId} className="px-5 py-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium">{l.product?.name ?? "Unavailable item"}</div>
                      <button onClick={() => remove(l.productId)} aria-label={`Remove ${l.product?.name ?? "item"}`} className="text-zinc-400 hover:text-red-600">
                        ✕
                      </button>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center">
                        <button
                          onClick={() => (l.qty <= 1 ? remove(l.productId) : setQty(l.productId, l.qty - 1))}
                          aria-label="Decrease quantity"
                          className="h-8 w-8 rounded-l-md border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={l.product?.stockQty}
                          value={l.qty}
                          onChange={(e) => setQty(l.productId, e.target.valueAsNumber)}
                          aria-label={`Quantity of ${l.product?.name ?? "item"}`}
                          className="h-8 w-14 border-y border-zinc-300 bg-transparent text-center dark:border-zinc-700 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          onClick={() => setQty(l.productId, l.qty + 1)}
                          aria-label="Increase quantity"
                          className="h-8 w-8 rounded-r-md border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                        >
                          +
                        </button>
                        <span className="ml-3 text-xs text-zinc-500">× {formatUGX(l.product?.sellingPrice ?? 0)}</span>
                      </div>
                      <div className="font-semibold">{formatUGX(l.lineTotal)}</div>
                    </div>
                    {l.problem && <div className="mt-1 text-xs text-red-600">{l.problem}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4 border-t border-zinc-100 px-4 py-4 sm:px-5 dark:border-zinc-800">
            {/* discount */}
            <div>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="discount" className="font-medium">
                  Discount
                </label>
                <div className="inline-flex overflow-hidden rounded-md border border-zinc-300 text-xs dark:border-zinc-700" role="group" aria-label="Discount type">
                  {(["FIXED", "PERCENT"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDiscountType(t)}
                      aria-pressed={discountType === t}
                      className={`px-2.5 py-1 ${discountType === t ? "bg-emerald-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                    >
                      {t === "FIXED" ? "UGX" : "%"}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="discount"
                name="discount"
                type="number"
                inputMode="numeric"
                min={0}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder="0"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
              />
              {discountError && <p className="mt-1 text-xs text-red-600">{discountError}</p>}
            </div>

            {/* totals */}
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd data-testid="subtotal">{formatUGX(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Discount</dt>
                <dd>-{formatUGX(discount)}</dd>
              </div>
              <div className="flex justify-between border-t border-zinc-100 pt-2 text-xl font-bold dark:border-zinc-800">
                <dt>Total</dt>
                <dd data-testid="total">{formatUGX(total)}</dd>
              </div>
            </dl>

            {/* payment */}
            <div>
              <div className="mb-1 text-sm font-medium">Payment method</div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    onClick={() => setMethod(m)}
                    className={`rounded-md border px-2 py-2 text-sm ${
                      method === m
                        ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {PAYMENT_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            {method === "CASH" ? (
              <div>
                <label htmlFor="tendered" className="text-sm font-medium">
                  Amount tendered (UGX)
                </label>
                <input
                  id="tendered"
                  name="tendered"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={tendered}
                  onChange={(e) => setTendered(e.target.value)}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setTendered(String(total))} disabled={total <= 0 && cart.length === 0} className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                    Exact
                  </button>
                  {QUICK_CASH.map((v) => (
                    <button key={v} type="button" onClick={() => setTendered(String(v))} className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      {v.toLocaleString("en-US")}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-sm" data-testid="change">
                  <span className="text-zinc-500">Change</span>
                  <span className={`font-semibold ${change !== null && change < 0 ? "text-red-600" : ""}`}>
                    {change === null ? "—" : change < 0 ? `Short by ${formatUGX(-change)}` : formatUGX(change)}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <label htmlFor="reference" className="text-sm font-medium">
                  Reference <span className="font-normal text-zinc-500">(optional)</span>
                </label>
                <input
                  id="reference"
                  name="reference"
                  value={reference}
                  maxLength={100}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={method === "MOBILE_MONEY" ? "Transaction ID" : method === "CARD" ? "Approval code" : "Transfer reference"}
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
                />
              </div>
            )}

            {notice && <div role="status" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{notice}</div>}
            {error && (
              <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={complete}
              disabled={!canComplete}
              className="max-lg:sticky max-lg:bottom-0 max-lg:-mx-4 max-lg:mt-2 max-lg:w-[calc(100%+2rem)] max-lg:border-t max-lg:border-zinc-200 max-lg:bg-white max-lg:px-4 max-lg:py-3 max-lg:dark:border-zinc-800 max-lg:dark:bg-zinc-900 w-full rounded-lg bg-emerald-600 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Processing…" : `Complete sale · ${formatUGX(total)}`}
            </button>
          </div>
        </div>
      </aside>

      {cart.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] z-50 flex h-12 animate-[cart-slide-up_180ms_ease-out] items-center justify-between overflow-hidden rounded-full border border-emerald-800 bg-emerald-700 px-4 text-sm font-semibold text-white shadow-lg lg:hidden"
            aria-label={`Open cart with ${cart.length} item${cart.length === 1 ? "" : " items"}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-7 w-7 shrink-0 items-center justify-center">
                <CartIcon />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-emerald-800">{cart.length}</span>
              </span>
              <span className="truncate whitespace-nowrap">{cart.length} item{cart.length === 1 ? "" : "s"}</span>
            </span>
            <span className="shrink-0 whitespace-nowrap">{formatUGX(total)}</span>
          </button>,
          document.body,
        )}

      {clearUndo && mounted && typeof document !== "undefined" &&
        createPortal(
         <div className="fixed inset-x-3 bottom-[calc(4rem+env(safe-area-inset-bottom)+4.25rem)] z-[55] flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900 lg:inset-x-auto lg:bottom-4 lg:right-4" role="status">
           <span>Cart cleared</span>
           <button type="button" onClick={undoClearCart} className="min-h-11 rounded-md px-3 font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
             Undo
           </button>
         </div>,
         document.body,
        )}

      {mobileCartOpen && (
        <button
          type="button"
          onClick={() => setMobileCartOpen(false)}
          aria-label="Close cart"
          className="fixed inset-0 z-50 bg-zinc-950/35 lg:hidden"
        />
      )}

      {mounted &&
        typeof document !== "undefined" &&
        document.getElementById("mobile-pos-cart-trigger") &&
        createPortal(
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            aria-label={`Open cart${cart.length > 0 ? ` with ${cart.length} item${cart.length === 1 ? "" : "s"}` : ""}`}
            className="relative mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-transform active:scale-95 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 lg:hidden"
          >
            <CartIcon />
            {mounted &&
              cart.length > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[11px] font-bold leading-none text-white">
                {cart.length}
              </span>
            )}
          </button>,
          document.getElementById("mobile-pos-cart-trigger")!,
        )}

      {done && (
        <Modal title="Sale complete" onClose={closeDone}>
          <div className="no-print mb-4 rounded-md bg-emerald-50 p-3 text-center text-emerald-800">
            <div className="text-sm">Sale {done.receipt.receiptNo} recorded</div>
            {done.receipt.paymentMethod === "CASH" && <div className="text-lg font-bold">Change: {formatUGX(done.change)}</div>}
          </div>
          <Receipt sale={done.receipt} />
          <div className="no-print mt-4 flex gap-2">
            <button onClick={() => window.print()} className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              Print receipt
            </button>
            <button onClick={closeDone} autoFocus className="flex-1 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              New sale
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
