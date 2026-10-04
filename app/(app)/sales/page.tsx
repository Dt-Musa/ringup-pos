import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatUGX, PAYMENT_LABELS } from "@/lib/format";

const PAGE_SIZE = 25;

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await guardPage("/sales");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const where = user.role === "CASHIER" ? { cashierId: user.id } : {};
  const [total, sales] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { cashier: { select: { name: true } }, _count: { select: { items: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Sales"
        description={user.role === "CASHIER" ? "Your completed sales." : "All sales. Refunds arrive in a later phase."}
      />
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="sales-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Receipt</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Cashier</th>
              <th className="px-4 py-2 text-right">Items</th>
              <th className="px-4 py-2">Payment</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-500">
                  No sales yet. <Link href="/pos" className="text-emerald-700 hover:underline">Open the POS</Link> to make one.
                </td>
              </tr>
            )}
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs font-semibold">{s.receiptNo}</td>
                <td className="px-4 py-2">{formatDateTime(s.createdAt)}</td>
                <td className="px-4 py-2">{s.cashier.name}</td>
                <td className="px-4 py-2 text-right">{s._count.items}</td>
                <td className="px-4 py-2">{PAYMENT_LABELS[s.paymentMethod]}</td>
                <td className="px-4 py-2 text-right font-medium">{formatUGX(s.total)}</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{s.status.replace("_", " ")}</span>
                </td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/sales/${s.id}/receipt`} className="text-emerald-700 hover:underline">
                    Receipt
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {total} sale{total === 1 ? "" : "s"}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-3">
            {page > 1 && <Link href={`/sales?page=${page - 1}`} className="text-emerald-700 hover:underline">← Previous</Link>}
            <span>
              Page {page} of {pages}
            </span>
            {page < pages && <Link href={`/sales?page=${page + 1}`} className="text-emerald-700 hover:underline">Next →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
