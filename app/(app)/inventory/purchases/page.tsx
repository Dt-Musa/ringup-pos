import { PurchasesManager } from "@/components/inventory/purchases-manager";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PurchasesPage() {
  await guardPage("/inventory");
  const [suppliers, products, orders] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true } }),
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { supplier: { select: { id: true, name: true } }, createdBy: { select: { name: true } }, items: { include: { product: { select: { id: true, name: true, sku: true } } } } },
    }),
  ]);
  return <PurchasesManager suppliers={suppliers} products={products} orders={orders.map((order) => ({ ...order, createdAt: order.createdAt.toISOString(), receivedAt: order.receivedAt?.toISOString() ?? null, invoiceDate: order.invoiceDate?.toISOString() ?? null }))} />;
}
