import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, isUniqueViolation, parseJson } from "@/lib/api-utils";
import { updateProductSchema } from "@/lib/validation/product";

type Ctx = { params: Promise<{ id: string }> };
const include = { category: { select: { id: true, name: true } } } as const;

export async function GET(_req: Request, { params }: Ctx) {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id }, include });
  if (!product || (!product.active && auth.user.role === "CASHIER")) return errorResponse("Product not found", 404);
  return NextResponse.json({ product });
}

// ADMIN / MANAGER. Also used to deactivate / reactivate ({ "active": false }).
// Changing stockQty records an ADJUSTMENT stock movement for the difference.
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const parsed = await parseJson(request, updateProductSchema);
  if (!parsed.ok) return parsed.response;
  const data = parsed.data;

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) return errorResponse("Selected category does not exist", 400, { categoryId: ["Selected category does not exist"] });
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      const existing = await tx.product.findUnique({ where: { id } });
      if (!existing) return null;
      const updated = await tx.product.update({ where: { id }, data, include });
      if (data.stockQty !== undefined && data.stockQty !== existing.stockQty) {
        await tx.stockMovement.create({
          data: {
            productId: id,
            type: "ADJUSTMENT",
            qty: data.stockQty - existing.stockQty,
            reason: `Stock corrected from ${existing.stockQty} to ${data.stockQty} (product edit)`,
            userId: auth.user.id,
          },
        });
      }
      return updated;
    });
    if (!product) return errorResponse("Product not found", 404);
    return NextResponse.json({ product });
  } catch (e) {
    if (isUniqueViolation(e, "sku")) {
      return errorResponse(`SKU "${data.sku}" is already used by another product`, 409, { sku: ["This SKU is already in use"] });
    }
    throw e;
  }
}

// ADMIN / MANAGER. Soft delete: products with sales/stock history must never be removed, so this only deactivates.
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return errorResponse("Product not found", 404);
  const product = await prisma.product.update({ where: { id }, data: { active: false }, include });
  return NextResponse.json({ product });
}
