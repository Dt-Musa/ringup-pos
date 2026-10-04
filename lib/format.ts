/** Formats whole UGX amounts, e.g. "UGX 12,500". */
export function formatUGX(amount: number) {
  const sign = amount < 0 ? "-" : "";
  return `${sign}UGX ${Math.abs(Math.round(amount)).toLocaleString("en-US")}`;
}
