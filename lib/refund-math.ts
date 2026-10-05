// Pure refund maths shared by the API and the refund modal.
//
// A sale's discount is spread proportionally over its items. The cumulative refundable value of a
// set of returned goods is  round(grossReturned * total / subtotal),  and each refund pays out the
// difference to what was already refunded. This makes a full refund always equal the sale total exactly
// (no rounding drift), however many partial refunds came before.

export function cumulativeRefundable(grossReturned: number, subtotal: number, total: number) {
  if (subtotal <= 0) return 0;
  if (grossReturned >= subtotal) return total;
  return Math.round((grossReturned * total) / subtotal);
}

export function refundAmount(opts: { subtotal: number; total: number; grossBefore: number; grossAfter: number; alreadyRefunded: number }) {
  const target = cumulativeRefundable(opts.grossAfter, opts.subtotal, opts.total);
  return Math.max(0, Math.min(opts.total - opts.alreadyRefunded, target - opts.alreadyRefunded));
}

/** Splits `amount` over lines in proportion to their gross value; the last line absorbs rounding. */
export function allocate(amount: number, grosses: number[]) {
  const sum = grosses.reduce((a, b) => a + b, 0);
  if (sum <= 0) return grosses.map(() => 0);
  let used = 0;
  return grosses.map((g, i) => {
    if (i === grosses.length - 1) return amount - used;
    const share = Math.round((amount * g) / sum);
    used += share;
    return share;
  });
}
