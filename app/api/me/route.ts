import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";

export async function GET() {
  const auth = await apiAuth();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ user: auth.user });
}
