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
    <main className="flex flex-1 items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">RingUp</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to continue</p>
        {reason === "session" && (
          <p role="status" className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Your session has ended or your account changed. Please sign in again.
          </p>
        )}
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-xs text-zinc-500">
          Demo: admin@pos.test, manager@pos.test, cashier@pos.test (password in README).
        </p>
      </div>
    </main>
  );
}
