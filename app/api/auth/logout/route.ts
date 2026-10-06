import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session";
import { safeNext } from "@/lib/safe-redirect";

/**
 * Deletes the session cookie on `res`. Done directly on the response (not via iron-session's destroy(), which
 * needs a decryptable cookie and a valid SESSION_SECRET) so even a dead or foreign cookie is always removed.
 */
async function clearSession(res: NextResponse) {
  (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Sidebar "Sign out" (fetch). */
export async function POST() {
  return clearSession(NextResponse.json({ ok: true }));
}

/**
 * GET /api/auth/logout?next=/login – deletes the session cookie, then redirects to `next` (same-origin paths
 * only, default /login). Pages send stale sessions here so a dead cookie can never cause a redirect loop.
 */
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"), "/login");
  return clearSession(NextResponse.redirect(new URL(next, request.url), 303));
}
