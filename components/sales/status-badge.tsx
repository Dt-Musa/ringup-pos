const STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-100 text-emerald-700",
  PARTIALLY_REFUNDED: "bg-amber-100 text-amber-700",
  REFUNDED: "bg-red-100 text-red-700",
  VOIDED: "bg-zinc-200 text-zinc-600",
};
const LABELS: Record<string, string> = { COMPLETED: "Completed", PARTIALLY_REFUNDED: "Partially refunded", REFUNDED: "Refunded", VOIDED: "Voided" };

export function SaleStatusBadge({ status }: { status: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? ""}`}>{LABELS[status] ?? status}</span>;
}
