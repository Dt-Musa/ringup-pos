import Link from "next/link";
import { StockAlertBanner } from "@/components/inventory/alert-banner";
import { InventoryFilters } from "@/components/inventory/filters";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNumber, formatUGX } from "@/lib/format";
import { getInventorySummary, listAlerts, listInventory } from "@/lib/inventory";
import { listInventorySchema } from "@/lib/validation/inventory";

type SP = Record<string, string | string[] | undefined>;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardPage("/inventory");
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listInventorySchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : listInventorySchema.parse({});

  const [summary, list, alerts, categories] = await Promise.all([
    getInventorySummary(),
    listInventory(filters),
    listAlerts(8),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);

  const cards = [
    { label: "Total products", value: formatNumber(summary.totalProducts), id: "total" },
    { label: "Low stock", value: formatNumber(summary.lowStock), id: "low", tone: summary.lowStock ? "text-amber-600" : "" },
    { label: "Out of stock", value: formatNumber(summary.outOfStock), id: "out", tone: summary.outOfStock ? "text-red-600" : "" },
    { label: "Inventory value (at cost)", value: formatUGX(summary.inventoryValue), id: "cost" },
    { label: "Potential retail value", value: formatUGX(summary.retailValue), id: "retail" },
  ];

  const pageHref = (page: number) => {
    const u = new URLSearchParams(flat as Record<string, string>);
    u.set("page", String(page));
    return `/inventory?${u.toString()}`;
  };

  return (
    <>
      <StockAlertBanner items={alerts} total={summary.lowStock + summary.outOfStock} linkToInventory={filters.status === "all"} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c, index) => (
          <div key={c.id} data-testid={`card-${c.id}`} className={`rounded-xl border border-zinc-200/80 bg-white p-4 shadow-sm shadow-zinc-200/30 dark:border-zinc-800 dark:bg-zinc-900 ${index > 2 ? "sm:col-span-1" : ""}`}>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{c.label}</div>
            <div className={`mt-1.5 text-xl font-bold tracking-tight ${c.tone ?? ""}`}>{c.value}</div>
          </div>
        ))}
      </div>
      <InventoryFilters categories={categories} />
      <InventoryTable items={list.items} />
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span>
          {list.total} product{list.total === 1 ? "" : "s"} (active products only)
        </span>
        {list.pages > 1 && (
          <div className="flex items-center gap-3">
            {list.page > 1 && <Link href={pageHref(list.page - 1)} className="text-emerald-700 hover:underline">← Previous</Link>}
            <span>
              Page {list.page} of {list.pages}
            </span>
            {list.page < list.pages && <Link href={pageHref(list.page + 1)} className="text-emerald-700 hover:underline">Next →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
