import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatUGX } from "@/lib/format";

export default async function ProductsPage() {
  await guardPage("/products");
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  return (
    <>
      <PageHeader title="Products" description="Read-only list for now; create/edit arrives in a later phase." />
      <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">SKU</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{p.category.name}</td>
                <td className="px-4 py-2 text-right">{formatUGX(p.buyingCost)}</td>
                <td className="px-4 py-2 text-right">{formatUGX(p.sellingPrice)}</td>
                <td className={`px-4 py-2 text-right ${p.stockQty <= p.minStock ? "font-semibold text-red-600" : ""}`}>
                  {p.stockQty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
