import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { canAccess, type Role } from "./permissions";
import { getSession, SESSION_COOKIE, type SessionData } from "./session";
import { STALE_SESSION_LOGOUT } from "./safe-redirect";

export type CurrentUser = { id: string; email: string; name: string; role: Role };

type SessionCheck = { user: CurrentUser; stale: false } | { user: null; stale: boolean };

/**
 * Validates the session cookie against the database. `stale` = a cookie exists but is no longer valid:
 * undecryptable (e.g. SESSION_SECRET rotated), the user was deleted / re-seeded (new id), deactivated, or
 * their role changed since they signed in (the cookie's role is what the proxy trusts, so it must match), or
 * their sessionVersion moved on (password reset, role change, deactivation – see lib/users.ts). Cookies
 * issued before sessionVersion existed carry none and are treated as stale (one forced re-login).
 */
export const checkSession = cache(async function checkSession(): Promise<SessionCheck> {
  let session: SessionData;
  try {
    session = { ...(await getSession()) };
  } catch (e) {
    if (e instanceof Error && /SESSION_SECRET/.test(e.message)) throw e; // misconfiguration, not a bad cookie
    return { user: null, stale: true };
  }
  if (!session.userId) return { user: null, stale: false };
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true, sessionVersion: true },
  });
  if (!user || !user.active || user.role !== session.role || user.sessionVersion !== session.sessionVersion) {
    return { user: null, stale: true };
  }
  return { user: { id: user.id, email: user.email, name: user.name, role: user.role }, stale: false };
});

/** Loads the signed-in user from the DB (so deletion / deactivation / role changes / password resets take effect immediately). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await checkSession()).user;
}

/**
 * For server components / layouts. Signed out → /login. A stale cookie → the logout route, which deletes the
 * cookie and THEN goes to /login. (Redirecting straight to /login with a stale cookie still present is what
 * used to loop with the proxy.) /login itself never redirects based on the cookie alone, so this cannot loop.
 */
export async function requireUser(): Promise<CurrentUser> {
  const s = await checkSession();
  if (s.user) return s.user;
  redirect(s.stale ? STALE_SESSION_LOGOUT : "/login");
}

/** For restricted pages: redirects to the dashboard when the role may not view `pathname`. */
export async function guardPage(pathname: string): Promise<CurrentUser> {
  const user = await requireUser();
  if (!canAccess(user.role, pathname)) redirect("/dashboard?denied=1");
  return user;
}

/**
 * For route handlers. Usage:
 *   const auth = await apiAuth(["ADMIN"]);
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth;
 */
export async function apiAuth(
  allowed?: Role[],
): Promise<{ ok: true; user: CurrentUser } | { ok: false; response: NextResponse }> {
  const s = await checkSession();
  const user = s.user;
  if (!user) {
    // drop the dead cookie (route-handler cookie store; NextResponse.cookies.set loses Max-Age here)
    if (s.stale) (await cookies()).delete({ name: SESSION_COOKIE, path: "/" });
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (allowed && !allowed.includes(user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}
