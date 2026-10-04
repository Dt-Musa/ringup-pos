import { PageHeader, Placeholder } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { StockAlertBanner } from "@/components/inventory/alert-banner";
import { prisma } from "@/lib/db";
import { getInventorySummary, listAlerts } from "@/lib/inventory";
import { formatUGX } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const isStaff = user.role !== "CASHIER";
  const [summary, alerts, today] = await Promise.all([
    getInventorySummary(),
    isStaff ? listAlerts(8) : Promise.resolve([]),
    prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfDay },
        status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        ...(user.role === "CASHIER" ? { cashierId: user.id } : {}),
      },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const cards = [
    { label: user.role === "CASHIER" ? "My sales today" : "Sales today", value: String(today._count) },
    { label: user.role === "CASHIER" ? "My revenue today" : "Revenue today", value: formatUGX(today._sum.total ?? 0) },
    { label: "Active products", value: String(summary.totalProducts) },
    { label: "Low stock", value: String(summary.lowStock), tone: summary.lowStock ? "text-amber-600" : "" },
    { label: "Out of stock", value: String(summary.outOfStock), tone: summary.outOfStock ? "text-red-600" : "" },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}.`} />
      {denied && (
        <div role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          You don&apos;t have permission to view that page.
        </div>
      )}
      {isStaff && <StockAlertBanner items={alerts} total={summary.lowStock + summary.outOfStock} />}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-5 shadow-sm dark:bg-zinc-900">
            <div className="text-sm text-zinc-500">{c.label}</div>
            <div className={`mt-2 text-2xl font-semibold ${c.tone ?? ""}`}>{c.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Placeholder>Charts and recent activity arrive in a later phase.</Placeholder>
      </div>
    </>
  );
}
