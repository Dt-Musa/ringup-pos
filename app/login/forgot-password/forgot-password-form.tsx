"use client";

import { useState } from "react";
import { btnPrimary, inputCls } from "@/components/ui/modal";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error ?? "Password recovery is temporarily unavailable. Please try again later.");
      else setMessage(data.message);
    } catch {
      setError("Password recovery is temporarily unavailable. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-slate-800">
        Email
        <input name="email" type="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className={`${inputCls} h-12 !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`} />
      </label>
      {message && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium leading-5 text-emerald-900">{message}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">{error}</p>}
      <button type="submit" disabled={pending} className={`${btnPrimary} min-h-12 w-full bg-emerald-800 text-base hover:bg-emerald-900`}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
