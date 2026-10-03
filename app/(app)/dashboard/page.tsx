import { PageHeader, Placeholder } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUGX } from "@/lib/format";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const { denied } = await searchParams;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [products, lowStock, today] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.product.findMany({ where: { active: true }, select: { stockQty: true, minStock: true } }).then(
      (rows) => rows.filter((p) => p.stockQty <= p.minStock).length,
    ),
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
    { label: "Active products", value: String(products) },
    { label: "Low / out of stock", value: String(lowStock) },
  ];

  return (
    <>
      <PageHeader title="Dashboard" description={`Welcome back, ${user.name}.`} />
      {denied && (
        <div role="alert" className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          You don&apos;t have permission to view that page.
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg bg-white p-5 shadow-sm dark:bg-zinc-900">
            <div className="text-sm text-zinc-500">{c.label}</div>
            <div className="mt-2 text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Placeholder>Charts and recent activity arrive in a later phase.</Placeholder>
      </div>
    </>
  );
}
