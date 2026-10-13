const STYLES: Record<string, string> = {
  COMPLETED: "border border-emerald-200 bg-emerald-100 text-emerald-800",
  PARTIALLY_REFUNDED: "border border-amber-200 bg-amber-100 text-amber-800",
  REFUNDED: "border border-red-200 bg-red-100 text-red-800",
  VOIDED: "border border-zinc-300 bg-zinc-200 text-zinc-800",
};
const LABELS: Record<string, string> = { COMPLETED: "Completed", PARTIALLY_REFUNDED: "Partially refunded", REFUNDED: "Refunded", VOIDED: "Voided" };

export function SaleStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[status] ?? ""}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {LABELS[status] ?? status}
    </span>
  );
}
