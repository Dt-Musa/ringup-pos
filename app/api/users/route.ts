import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// ADMIN only. (Create/update/deactivate arrives in a later phase.)
export async function GET() {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ users });
}
