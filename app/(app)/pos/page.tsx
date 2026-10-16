import { PosScreen } from "@/components/pos/pos-screen";
import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { productImagePath } from "@/lib/product-images";

export default async function PosPage() {
  await guardPage("/pos");
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, sku: true, barcode: true, name: true, image: true, categoryId: true, sellingPrice: true, stockQty: true, minStock: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  const productsWithImages = products.map((product) => ({ ...product, image: productImagePath(product.name, product.image) }));
  return (
    <>
      <PageHeader title="Point of Sale" description="Build a basket, take payment and issue receipts." mobileCompact />
      <PosScreen products={productsWithImages} categories={categories} />
    </>
  );
}
