import Link from "next/link";
import { inputCls } from "@/components/ui/modal";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { listMovements } from "@/lib/inventory";
import { listMovementsSchema } from "@/lib/validation/inventory";

type SP = Record<string, string | string[] | undefined>;

const TYPE_STYLES: Record<string, string> = {
  SALE: "bg-blue-100 text-blue-700",
  ADDITION: "bg-emerald-100 text-emerald-700",
  REDUCTION: "bg-red-100 text-red-700",
  ADJUSTMENT: "bg-purple-100 text-purple-700",
  RETURN: "bg-teal-100 text-teal-700",
};

export default async function StockHistoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  // access is enforced by app/(app)/inventory/layout.tsx (ADMIN / MANAGER)
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listMovementsSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : listMovementsSchema.parse({});

  const [data, products, users] = await Promise.all([
    listMovements(filters),
    prisma.product.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, sku: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const pageHref = (page: number) => {
    const u = new URLSearchParams(Object.entries(flat).filter(([, v]) => v) as [string, string][]);
    u.set("page", String(page));
    return `/inventory/history?${u.toString()}`;
  };

  return (
    <>
      <form method="get" action="/inventory/history" className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6" data-testid="history-filters">
        <select name="productId" defaultValue={filters.productId ?? ""} aria-label="Product" className={`${inputCls} mt-0 lg:col-span-2`}>
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
        <select name="type" defaultValue={filters.type ?? ""} aria-label="Movement type" className={`${inputCls} mt-0`}>
          <option value="">All types</option>
          {["SALE", "ADDITION", "REDUCTION", "ADJUSTMENT", "RETURN"].map((t) => (
            <option key={t} value={t}>
              {t[0] + t.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select name="userId" defaultValue={filters.userId ?? ""} aria-label="User" className={`${inputCls} mt-0`}>
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from ?? ""} aria-label="From date" className={`${inputCls} mt-0`} />
        <input type="date" name="to" defaultValue={filters.to ?? ""} aria-label="To date" className={`${inputCls} mt-0`} />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Apply filters
          </button>
          <Link href="/inventory/history" className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
            Clear
          </Link>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200/80 bg-white shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="history-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Change</th>
              <th className="px-4 py-2 text-right">Before → After</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">User</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No stock movements match these filters.
                </td>
              </tr>
            )}
            {data.movements.map((m) => (
              <tr key={m.id} className="border-t border-zinc-100 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/40">
                <td data-label="Date" className="whitespace-nowrap px-4 py-2">{formatDateTime(m.createdAt)}</td>
                <td data-label="Product" className="px-4 py-2">
                  <div className="font-medium">{m.product.name}</div>
                  <div className="font-mono text-xs text-zinc-500">{m.product.sku}</div>
                </td>
                <td data-label="Type" className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[m.type]}`}>{m.type[0] + m.type.slice(1).toLowerCase()}</span>
                </td>
                <td data-label="Change" className={`px-4 py-2 text-right font-semibold ${m.qty < 0 ? "text-red-600" : "text-emerald-700"}`}>
                  {m.qty > 0 ? "+" : ""}
                  {m.qty}
                </td>
                <td data-label="Before → After" className="whitespace-nowrap px-4 py-2 text-right text-zinc-600">
                  {m.qtyBefore ?? "—"} → {m.qtyAfter ?? "—"}
                </td>
                <td data-label="Reason" className="px-4 py-2">
                  {m.sale ? (
                    <Link href={`/sales/${m.sale.id}/receipt`} className="text-emerald-700 hover:underline">
                      Sale {m.sale.receiptNo}
                    </Link>
                  ) : (
                    (m.reason ?? "—")
                  )}
                </td>
                <td data-label="User" className="px-4 py-2">{m.user.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span data-testid="history-count">
          {data.total} movement{data.total === 1 ? "" : "s"}
        </span>
        {data.pages > 1 && (
          <div className="flex items-center gap-3">
            {data.page > 1 && <Link href={pageHref(data.page - 1)} className="text-emerald-700 hover:underline">← Previous</Link>}
            <span>
              Page {data.page} of {data.pages}
            </span>
            {data.page < data.pages && <Link href={pageHref(data.page + 1)} className="text-emerald-700 hover:underline">Next →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
