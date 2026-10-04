import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, isUniqueViolation, parseJson, validate } from "@/lib/api-utils";
import { listProducts } from "@/lib/products";
import { createProductSchema, listProductsSchema } from "@/lib/validation/product";

// GET: every signed-in role (the POS needs the catalogue). Cashiers only ever see active products.
export async function GET(request: Request) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = validate(listProductsSchema, params);
  if (!parsed.ok) return parsed.response;
  const filters = parsed.data;
  if (auth.user.role === "CASHIER") filters.status = "active";

  return NextResponse.json(await listProducts(filters));
}

// POST: ADMIN / MANAGER. Opening stock is recorded as an ADDITION stock movement.
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;

  const parsed = await parseJson(request, createProductSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) return errorResponse("Selected category does not exist", 400, { categoryId: ["Selected category does not exist"] });

  try {
    const product = await prisma.$transaction(async (tx) => {
      const p = await tx.product.create({ data, include: { category: { select: { id: true, name: true } } } });
      if (data.stockQty > 0) {
        await tx.stockMovement.create({
          data: { productId: p.id, type: "ADDITION", qty: data.stockQty, reason: "Initial stock", userId: auth.user.id },
        });
      }
      return p;
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    if (isUniqueViolation(e, "sku")) {
      return errorResponse(`SKU "${data.sku}" is already used by another product`, 409, { sku: ["This SKU is already in use"] });
    }
    throw e;
  }
}
