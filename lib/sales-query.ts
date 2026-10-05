import "server-only";
import type { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "./db";
import { dayRangeEAT } from "./dates";
import type { CurrentUser } from "./auth";
import type { listSalesSchema } from "./validation/refund";

export type SalesFilters = z.infer<typeof listSalesSchema>;

export function salesWhere(f: SalesFilters, user: CurrentUser): Prisma.SaleWhereInput {
  const where: Prisma.SaleWhereInput = {};
  if (user.role === "CASHIER") where.cashierId = user.id; // cashiers only ever see their own sales
  else if (f.cashierId) where.cashierId = f.cashierId;
  if (f.q) where.receiptNo = { contains: f.q.replace(/\s+/g, ""), mode: "insensitive" };
  const range = dayRangeEAT(f.from, f.to);
  if (range) where.createdAt = range;
  if (f.paymentMethod) where.paymentMethod = f.paymentMethod;
  if (f.status) where.status = f.status;
  return where;
}

export async function listSales(f: SalesFilters, user: CurrentUser) {
  const where = salesWhere(f, user);
  const [count, sales, agg] = await Promise.all([
    prisma.sale.count({ where }),
    prisma.sale.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
      include: { cashier: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    }),
    prisma.sale.aggregate({ where, _sum: { subtotal: true, discount: true, total: true, refundedAmount: true } }),
  ]);
  const gross = agg._sum.total ?? 0;
  const refunded = agg._sum.refundedAmount ?? 0;
  return {
    sales,
    total: count,
    page: f.page,
    pageSize: f.pageSize,
    pages: Math.max(1, Math.ceil(count / f.pageSize)),
    totals: { count, subtotal: agg._sum.subtotal ?? 0, discount: agg._sum.discount ?? 0, gross, refunded, net: gross - refunded },
  };
}

export const saleDetailInclude = {
  cashier: { select: { id: true, name: true } },
  items: {
    include: { product: { select: { name: true, sku: true } }, refundItems: { select: { qty: true } } },
    orderBy: { id: "asc" },
  },
  refunds: {
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true } },
      items: { include: { saleItem: { select: { unitPrice: true, product: { select: { name: true, sku: true } } } } } },
    },
  },
} satisfies Prisma.SaleInclude;
