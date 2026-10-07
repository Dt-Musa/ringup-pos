import { Suspense } from "react";
import { redirect } from "next/navigation";
import { checkSession } from "@/lib/auth";
import { safeNext, STALE_SESSION_LOGOUT } from "@/lib/safe-redirect";
import LoginForm from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reason?: string }> }) {
  const { next, reason } = await searchParams;
  // Only a session that is valid IN THE DATABASE skips the login form (the proxy never redirects /login based
  // on the cookie alone). A stale cookie is sent once through the logout route to delete it; that comes back
  // as /login?reason=session, which never redirects again – so the chain is bounded even if deletion failed.
  const s = await checkSession();
  if (s.user) redirect(safeNext(next));
  if (s.stale && reason !== "session") redirect(STALE_SESSION_LOGOUT);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 py-6 max-sm:bg-white sm:py-10">
      <div className="absolute inset-0 max-sm:hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_32%)]" />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-black/30 max-sm:border-0 max-sm:p-4 max-sm:shadow-none sm:p-9">
        <div className="mb-7 flex items-center gap-3 sm:mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-lg font-bold text-white shadow-lg shadow-emerald-900/20">R</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950">RingUp</h1>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">Point of sale</p>
          </div>
        </div>
        <p className="mt-1 text-sm font-medium text-slate-600">Sign in to continue</p>
        {reason === "session" && (
          <p role="status" className="mt-4 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm font-medium leading-6 text-amber-950">
            Your session has ended or your account changed. Please sign in again.
          </p>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
