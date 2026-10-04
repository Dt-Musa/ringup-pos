import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validation/product";

// ADMIN / MANAGER – rename a category.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const parsed = await parseJson(request, categorySchema);
  if (!parsed.ok) return parsed.response;
  const { name } = parsed.data;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return errorResponse("Category not found", 404);
  const dup = await prisma.category.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: { id } } });
  if (dup) return errorResponse(`A category named "${dup.name}" already exists`, 409, { name: ["This name is already in use"] });

  const category = await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json({ category });
}
