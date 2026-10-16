import { SuppliersManager } from "@/components/inventory/suppliers-manager";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function SuppliersPage() {
  await guardPage("/inventory");
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { purchaseOrders: true } } } });
  return <><h2 className="mb-4 text-xl font-semibold">Suppliers</h2><SuppliersManager suppliers={suppliers} /></>;
}
