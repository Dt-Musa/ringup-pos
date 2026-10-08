import { NextResponse, type NextRequest } from "next/server";
import { unsealData } from "iron-session";
import { canAccess } from "@/lib/permissions";
import { SESSION_COOKIE, type SessionData } from "@/lib/session";

// First line of defence: cookie-based role checks for pages and APIs.
// Layouts/pages/route handlers re-verify against the database (see lib/auth.ts).

const PUBLIC_PATHS = ["/", "/login", "/api/auth/login", "/api/auth/logout", "/api/health"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  let session: SessionData = {};
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && process.env.SESSION_SECRET) {
    try {
      session = await unsealData<SessionData>(cookie, { password: process.env.SESSION_SECRET, ttl: 60 * 60 * 12 });
    } catch {
      session = {};
    }
  }
  const role = session.userId ? session.role : undefined;

  // A cookie that can't be decrypted (rotated SESSION_SECRET, expired, tampered) is dropped on the way out.
  const dropDeadCookie = (res: NextResponse) => {
    if (cookie && !role) res.cookies.set(SESSION_COOKIE, "", { path: "/", httpOnly: true, sameSite: "lax", maxAge: 0, expires: new Date(0) });
    return res;
  };

  // Public paths are never redirected based on the cookie: the cookie alone can't prove the user still exists
  // (deleted / re-seeded / deactivated). /login checks the database itself and only then goes to /dashboard.
  if (PUBLIC_PATHS.includes(pathname)) return dropDeadCookie(NextResponse.next());

  if (!role) {
    if (isApi) return dropDeadCookie(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return dropDeadCookie(NextResponse.redirect(url));
  }

  if (pathname === "/") return NextResponse.redirect(new URL("/dashboard", request.url));

  if (!canAccess(role, pathname, request.method)) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard?denied=1", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
