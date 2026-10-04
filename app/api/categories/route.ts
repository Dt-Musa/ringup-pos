import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { categorySchema } from "@/lib/validation/product";

export async function GET() {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ categories });
}

// ADMIN / MANAGER
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, categorySchema);
  if (!parsed.ok) return parsed.response;
  const { name } = parsed.data;

  const dup = await prisma.category.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
  if (dup) return errorResponse(`A category named "${dup.name}" already exists`, 409, { name: ["This name is already in use"] });

  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({ data: { name, sortOrder: (max._max.sortOrder ?? -1) + 1 } });
  return NextResponse.json({ category }, { status: 201 });
}
