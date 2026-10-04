import { Suspense } from "react";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-100 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow dark:bg-zinc-900">
        <h1 className="text-2xl font-semibold">RingUp</h1>
        <p className="mt-1 text-sm text-zinc-500">Sign in to continue</p>
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
