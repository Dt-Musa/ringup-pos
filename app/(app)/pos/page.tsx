import { PosScreen } from "@/components/pos/pos-screen";
import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PosPage() {
  await guardPage("/pos");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, name: true, image: true, categoryId: true, sellingPrice: true, stockQty: true, minStock: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  return (
    <>
      <PageHeader title="Point of Sale" description="Build a basket, take payment and issue receipts." />
      <PosScreen products={products} categories={categories} />
    </>
  );
}
