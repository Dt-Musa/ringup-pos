import type { StockStatus } from "@/lib/inventory";

const STYLES: Record<StockStatus, string> = {
  IN_STOCK: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  LOW: "border border-amber-200 bg-amber-100 text-amber-800",
  OUT: "border border-red-200 bg-red-100 text-red-800",
};
const LABELS: Record<StockStatus, string> = { IN_STOCK: "In stock", LOW: "Low", OUT: "Out" };

export function StockBadge({ status }: { status: StockStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
