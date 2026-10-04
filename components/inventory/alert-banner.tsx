import Link from "next/link";
import { formatNumber } from "@/lib/format";

type Alert = { id: string; sku: string; name: string; stockQty: number; minStock: number };

/** Low / out-of-stock alerts. `total` is the full count; `items` the most urgent few. */
export function StockAlertBanner({ items, total, linkToInventory = true }: { items: Alert[]; total: number; linkToInventory?: boolean }) {
  if (total === 0) return null;
  const out = items.filter((i) => i.stockQty <= 0).length;
  return (
    <div role="alert" data-testid="stock-alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <div className="flex items-center justify-between gap-4">
        <div className="font-semibold">
          ⚠ {formatNumber(total)} item{total === 1 ? "" : "s"} need restocking{out ? ` (${out}${items.length < total ? "+" : ""} out of stock)` : ""}
        </div>
        {linkToInventory && (
          <Link href="/inventory?status=low" className="shrink-0 text-amber-800 underline hover:no-underline dark:text-amber-200">
            View low stock
          </Link>
        )}
      </div>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3">
            <span>
              {i.name} <span className="font-mono text-xs opacity-70">{i.sku}</span>
            </span>
            <span className={i.stockQty <= 0 ? "font-semibold text-red-700" : "font-semibold"}>
              {i.stockQty <= 0 ? "Out of stock" : `${i.stockQty} left (min ${i.minStock})`}
            </span>
          </li>
        ))}
      </ul>
      {items.length < total && <div className="mt-2 text-xs opacity-80">…and {total - items.length} more.</div>}
    </div>
  );
}
