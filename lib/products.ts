import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { z } from "zod";
import type { listProductsSchema } from "./validation/product";

export type ProductFilters = z.infer<typeof listProductsSchema>;

/** Builds the Prisma filter shared by the products page and GET /api/products. */
export function productWhere(f: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { sku: { contains: f.q, mode: "insensitive" } },
    ];
  }
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.status === "active") where.active = true;
  if (f.status === "inactive") where.active = false;
  return where;
}

export async function listProducts(f: ProductFilters) {
  const where = productWhere(f);
  // low/out-of-stock compares two columns, which Prisma can't express – use a raw id filter.
  if (f.stock) {
    const ids =
      f.stock === "out"
        ? await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "stockQty" <= 0`
        : await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE "stockQty" <= "minStock"`;
    where.id = { in: ids.map((r) => r.id) };
  }
  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
  ]);
  return { total, products, page: f.page, pageSize: f.pageSize, pages: Math.max(1, Math.ceil(total / f.pageSize)) };
}
