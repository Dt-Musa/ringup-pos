import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, isUniqueViolation, parseJson } from "@/lib/api-utils";
import { prisma } from "@/lib/db";
import { supplierSchema } from "@/lib/validation/inventory";

export async function GET() {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { purchaseOrders: true } } },
  });
  return NextResponse.json({ suppliers });
}

export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, supplierSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const supplier = await prisma.supplier.create({ data: parsed.data });
    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error, "name")) return errorResponse("A supplier with this name already exists", 409, { name: ["This name is already in use"] });
    throw error;
  }
}
