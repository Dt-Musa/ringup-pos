import Link from "next/link";
import { notFound } from "next/navigation";
import { RefundButton } from "@/components/sales/refund-button";
import { SaleStatusBadge } from "@/components/sales/status-badge";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatUGX, PAYMENT_LABELS } from "@/lib/format";
import { saleDetailInclude } from "@/lib/sales-query";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guardPage("/sales");
  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleDetailInclude });
  if (!sale || (user.role === "CASHIER" && sale.cashierId !== user.id)) notFound(); // cashiers: own sales only

  const items = sale.items.map((i) => {
    const refundedQty = i.refundItems.reduce((s, r) => s + r.qty, 0);
    return { ...i, refundedQty, remaining: i.qty - refundedQty };
  });
  const canRefund = user.role !== "CASHIER" && sale.status !== "VOIDED" && items.some((i) => i.remaining > 0);
  const change = sale.amountTendered !== null ? sale.amountTendered - sale.total : null;
  const net = sale.total - sale.refundedAmount;

  return (
    <div className="max-w-5xl">
      <div className="mb-2">
        <Link href="/sales" className="text-sm text-emerald-700 hover:underline">
          ← Back to sales
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">
            <span className="font-mono" data-testid="receipt-no">{sale.receiptNo}</span>
            <SaleStatusBadge status={sale.status} />
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {formatDateTime(sale.createdAt)} · Cashier: {sale.cashier.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/sales/${sale.id}/receipt`} className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            View / print receipt
          </Link>
          {canRefund && (
            <RefundButton
              sale={{
                id: sale.id,
                receiptNo: sale.receiptNo,
                subtotal: sale.subtotal,
                total: sale.total,
                refundedAmount: sale.refundedAmount,
                items: items.map((i) => ({ id: i.id, name: i.product.name, sku: i.product.sku, unitPrice: i.unitPrice, qty: i.qty, refundedQty: i.refundedQty })),
              }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
          <table className="w-full text-left text-sm" data-testid="sale-items">
            <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
              <tr>
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Qty</th>
                <th className="px-4 py-2 text-right">Refunded</th>
                <th className="px-4 py-2 text-right">Line total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-2">
                    <div className="font-medium">{i.product.name}</div>
                    <div className="font-mono text-xs text-zinc-500">{i.product.sku}</div>
                  </td>
                  <td className="px-4 py-2 text-right">{formatUGX(i.unitPrice)}</td>
                  <td className="px-4 py-2 text-right">{i.qty}</td>
                  <td className={`px-4 py-2 text-right ${i.refundedQty ? "font-semibold text-red-600" : "text-zinc-400"}`}>{i.refundedQty || "—"}</td>
                  <td className="px-4 py-2 text-right">{formatUGX(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="space-y-4">
          <dl className="space-y-1 rounded-lg bg-white p-4 text-sm shadow-sm dark:bg-zinc-900" data-testid="sale-summary">
            <div className="flex justify-between"><dt className="text-zinc-500">Subtotal</dt><dd>{formatUGX(sale.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-zinc-500">Discount</dt><dd>-{formatUGX(sale.discount)}</dd></div>
            <div className="flex justify-between border-t border-zinc-100 pt-2 font-semibold dark:border-zinc-800"><dt>Total</dt><dd>{formatUGX(sale.total)}</dd></div>
            {sale.refundedAmount > 0 && (
              <>
                <div className="flex justify-between text-red-600"><dt>Refunded</dt><dd>-{formatUGX(sale.refundedAmount)}</dd></div>
                <div className="flex justify-between text-base font-bold"><dt>Net</dt><dd data-testid="net-total">{formatUGX(net)}</dd></div>
              </>
            )}
          </dl>
          <dl className="space-y-1 rounded-lg bg-white p-4 text-sm shadow-sm dark:bg-zinc-900">
            <div className="mb-1 font-semibold">Payment</div>
            <div className="flex justify-between"><dt className="text-zinc-500">Method</dt><dd>{PAYMENT_LABELS[sale.paymentMethod]}</dd></div>
            {sale.paymentReference && <div className="flex justify-between"><dt className="text-zinc-500">Reference</dt><dd>{sale.paymentReference}</dd></div>}
            {sale.amountTendered !== null && (
              <>
                <div className="flex justify-between"><dt className="text-zinc-500">Tendered</dt><dd>{formatUGX(sale.amountTendered)}</dd></div>
                <div className="flex justify-between"><dt className="text-zinc-500">Change</dt><dd>{formatUGX(change ?? 0)}</dd></div>
              </>
            )}
          </dl>
        </aside>
      </div>

      <section className="mt-8" data-testid="refund-history">
        <h2 className="mb-3 text-lg font-semibold">Refund history</h2>
        {sale.refunds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500 dark:border-zinc-700">No refunds on this sale.</p>
        ) : (
          <ul className="space-y-3">
            {sale.refunds.map((r) => (
              <li key={r.id} className="rounded-lg bg-white p-4 text-sm shadow-sm dark:bg-zinc-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-red-600">-{formatUGX(r.amount)}</span>
                    <span className="ml-3 text-zinc-500">
                      {formatDateTime(r.createdAt)} · by {r.user.name}
                    </span>
                  </div>
                  {r.method && <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800">Paid back: {r.method}</span>}
                </div>
                <ul className="mt-2 list-inside list-disc text-zinc-700 dark:text-zinc-300">
                  {r.items.map((i) => (
                    <li key={i.id}>
                      {i.qty} × {i.saleItem.product.name} <span className="text-zinc-500">({formatUGX(i.amount)}{i.restock ? ", restocked" : ", not restocked"})</span>
                    </li>
                  ))}
                </ul>
                {r.reason && <div className="mt-2 text-zinc-600">Reason: {r.reason}</div>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
