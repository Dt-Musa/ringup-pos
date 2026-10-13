import type { StockStatus } from "@/lib/inventory";

const STYLES: Record<StockStatus, string> = {
  IN_STOCK: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  LOW: "border border-amber-200 bg-amber-100 text-amber-800",
  OUT: "border border-red-200 bg-red-100 text-red-800",
};
const LABELS: Record<StockStatus, string> = { IN_STOCK: "In stock", LOW: "Low", OUT: "Out" };

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
