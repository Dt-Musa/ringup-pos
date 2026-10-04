import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ProductFilters } from "@/components/products/filters";
import { ProductsManager } from "@/components/products/products-manager";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listProducts } from "@/lib/products";
import { listProductsSchema } from "@/lib/validation/product";

type SP = Record<string, string | string[] | undefined>;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await guardPage("/products"); // ADMIN / MANAGER only
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listProductsSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : listProductsSchema.parse({});

  const [result, categories] = await Promise.all([
    listProducts(filters),
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
  ]);

  const rows = result.products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    image: p.image,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    buyingCost: p.buyingCost,
    sellingPrice: p.sellingPrice,
    stockQty: p.stockQty,
    minStock: p.minStock,
    active: p.active,
  }));
  const cats = categories.map((c) => ({ id: c.id, name: c.name, productCount: c._count.products }));

  const pageHref = (page: number) => {
    const u = new URLSearchParams(flat as Record<string, string>);
    u.set("page", String(page));
    return `/products?${u.toString()}`;
  };

  return (
    <>
      <PageHeader title="Products" description="Manage your catalogue, prices and stock levels." />
      <ProductFilters categories={cats} />
      <ProductsManager products={rows} categories={cats} />
      <div className="mt-4 flex items-center justify-between text-sm text-zinc-500">
        <span data-testid="products-count">
          {result.total} product{result.total === 1 ? "" : "s"}
        </span>
        {result.pages > 1 && (
          <div className="flex items-center gap-3">
            {result.page > 1 && <Link href={pageHref(result.page - 1)} className="text-emerald-700 hover:underline">← Previous</Link>}
            <span>
              Page {result.page} of {result.pages}
            </span>
            {result.page < result.pages && <Link href={pageHref(result.page + 1)} className="text-emerald-700 hover:underline">Next →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
