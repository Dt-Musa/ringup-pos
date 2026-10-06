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
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? (res.status >= 500 ? "Server error, try again" : "Login failed"));
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
          required
          autoComplete="username"
          className={`${inputCls} login-input !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`}
        />
      </label>
      <label className="block text-sm font-semibold text-slate-800">
        Password
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={`${inputCls} login-input !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`}
        />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} min-h-12 w-full text-base`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
