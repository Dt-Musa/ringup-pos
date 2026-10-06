/** Returns `v` if it is a same-origin path ("/x", not "//host" or "/\host"), otherwise `fallback`. */
export function safeNext(v: string | null | undefined, fallback = "/dashboard") {
  if (!v || typeof v !== "string") return fallback;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(v)) return fallback;
  return v;
}

/** Where pages send a browser whose session cookie no longer matches a valid user: clears it, then /login. */
export const STALE_SESSION_LOGOUT = `/api/auth/logout?next=${encodeURIComponent("/login?reason=session")}`;
