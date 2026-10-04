import type { StockStatus } from "@/lib/inventory";

const STYLES: Record<StockStatus, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-700",
  LOW: "bg-amber-100 text-amber-700",
  OUT: "bg-red-100 text-red-700",
};
const LABELS: Record<StockStatus, string> = { IN_STOCK: "In stock", LOW: "Low", OUT: "Out" };

export function StockBadge({ status }: { status: StockStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
