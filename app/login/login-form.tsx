"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-redirect";
import { inputCls, btnPrimary } from "@/components/ui/modal";

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
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-95"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} min-h-12 w-full bg-emerald-800 text-base hover:bg-emerald-900`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
