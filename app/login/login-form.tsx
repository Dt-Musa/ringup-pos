"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-redirect";
import { inputCls, btnPrimary } from "@/components/ui/modal";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
    } catch {
      setError("Server error, try again");
      setPending(false);
      return;
    }
    if (res.ok) {
      router.replace(safeNext(params.get("next")));
      router.refresh();
    } else {
      setError(res.status >= 500 ? "We couldn't sign you in right now. Please try again." : "The email or password is incorrect. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="login-form mt-6 space-y-5">
      <label className="block text-sm font-semibold text-slate-800">
        Email
        <input
          name="email"
          type="email"
          inputMode="email"
          required
          autoComplete="username"
          className={`${inputCls} login-input h-12 !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Password
        <span className="relative block">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className={`${inputCls} h-12 pr-12 login-input !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 active:scale-95"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              {showPassword ? (
                <>
                  <path d="M3 3l18 18" />
                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                  <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.7 4 10 8a14.8 14.8 0 0 1-3.1 5.1" />
                  <path d="M6.6 6.6C4.8 7.8 3.5 9.7 2 12c1.3 4 5 8 10 8 1 0 2-.2 2.9-.5" />
                </>
              ) : (
                <>
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="2.5" />
                </>
              )}
            </svg>
          </button>
        </span>
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} min-h-12 w-full bg-emerald-800 text-base hover:bg-emerald-900`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link href="/login/forgot-password" className="block text-center text-sm font-semibold text-emerald-800 hover:text-emerald-950">
        Forgot your password?
      </Link>
    </form>
  );
}
