const STYLES: Record<string, string> = {
  COMPLETED: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  PARTIALLY_REFUNDED: "border border-amber-200 bg-amber-100 text-amber-800",
  REFUNDED: "border border-red-200 bg-red-100 text-red-800",
  VOIDED: "border border-zinc-300 bg-zinc-200 text-zinc-800",
};
const LABELS: Record<string, string> = { COMPLETED: "Completed", PARTIALLY_REFUNDED: "Partially refunded", REFUNDED: "Refunded", VOIDED: "Voided" };

export function SaleStatusBadge({ status }: { status: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? ""}`}>{LABELS[status] ?? status}</span>;
}
