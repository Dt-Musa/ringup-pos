import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { dayRangeEAT } from "@/lib/dates";
import { getFinancials } from "@/lib/finance";

// ADMIN / MANAGER only. Placeholder aggregate (net of refunds); full reports arrive in a later phase.
export async function GET(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;
  const sp = new URL(request.url).searchParams;
  const ok = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const f = await getFinancials(dayRangeEAT(ok(sp.get("from")), ok(sp.get("to"))));
  return NextResponse.json({ ...f, currency: "UGX" });
}
