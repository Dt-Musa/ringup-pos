import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { purchaseOrderSchema } from "@/lib/validation/inventory";

export async function GET() {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const orders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      supplier: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      items: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, purchaseOrderSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;
  if (new Set(data.items.map((item) => item.productId)).size !== data.items.length) {
    return errorResponse("Add each product only once to a purchase order", 400, { items: ["Duplicate products are not allowed"] });
  }
  const total = data.items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  if (!Number.isSafeInteger(total) || total > 2_000_000_000) return errorResponse("Purchase order total is too large", 400, { items: ["Reduce quantities or unit costs"] });

  const [supplier, products] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: data.supplierId }, select: { id: true } }),
    prisma.product.findMany({ where: { id: { in: data.items.map((item) => item.productId) }, active: true }, select: { id: true } }),
  ]);
  if (!supplier) return errorResponse("Selected supplier does not exist", 400, { supplierId: ["Selected supplier does not exist"] });
  if (products.length !== data.items.length) return errorResponse("One or more selected products are unavailable", 400, { items: ["Choose active products"] });

  const poNumber = `PO-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  const order = await prisma.purchaseOrder.create({
    data: {
      poNumber,
      supplierId: data.supplierId,
      createdById: auth.user.id,
      notes: data.notes,
      total,
      items: { create: data.items },
    },
    include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
  });
  return NextResponse.json({ order }, { status: 201 });
}
