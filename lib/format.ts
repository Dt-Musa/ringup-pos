/** Formats whole UGX amounts, e.g. "UGX 12,500". */
export function formatUGX(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}UGX ${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}

export function formatDateTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Kampala",
  }).format(new Date(d));
}

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
};
