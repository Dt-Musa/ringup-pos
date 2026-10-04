import { PosScreen } from "@/components/pos/pos-screen";
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
      <h1 className="mb-4 text-2xl font-semibold">Point of Sale</h1>
      <PosScreen products={products} categories={categories} />
    </>
  );
}
