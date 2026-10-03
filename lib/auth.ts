import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { canAccess, type Role } from "./permissions";
import { getSession } from "./session";

export type CurrentUser = { id: string; email: string; name: string; role: Role };

/** Loads the signed-in user from the DB (so deactivation / role changes take effect immediately). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** For server components / layouts: redirect to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
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
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (allowed && !allowed.includes(user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}
