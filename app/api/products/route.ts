import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Readable by every signed-in role (the POS needs the catalogue).
export async function GET() {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  const products = await prisma.product.findMany({
    where: { active: true },
    include: { category: { select: { id: true, name: true } } },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json({ products });
}

// ADMIN / MANAGER only. Real implementation arrives in a later phase.
export async function POST() {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
