import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { validate } from "@/lib/api-utils";
import { getInventorySummary, listInventory } from "@/lib/inventory";
import { listInventorySchema } from "@/lib/validation/inventory";

// ADMIN / MANAGER. Stock overview + summary cards. (Active products only.)
export async function GET(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const parsed = validate(listInventorySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.ok) return parsed.response;
  const [summary, list] = await Promise.all([getInventorySummary(), listInventory(parsed.data)]);
  return NextResponse.json({ summary, ...list });
}
