"use client";

import { useState } from "react";
import { btnPrimary, inputCls } from "@/components/ui/modal";
import { passwordProblem } from "@/components/users/field";

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(token ? null : "This reset link is invalid or has expired.");
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const problem = passwordProblem(password);
    if (problem) return setError(problem);
    if (confirm !== password) return setError("Passwords don’t match");
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error ?? "Password reset is temporarily unavailable. Please try again later.");
      else setSuccess(true);
    } catch {
      setError("Password reset is temporarily unavailable. Please try again later.");
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return <p role="status" className="mt-6 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm font-medium leading-5 text-emerald-900">Your password has been reset. You can now sign in.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-5">
      <label className="block text-sm font-semibold text-slate-800">
        New password
        <input name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" className={`${inputCls} h-12 !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`} />
      </label>
      <p className="-mt-3 text-xs text-slate-600">At least 8 characters, with a letter and a number.</p>
      <label className="block text-sm font-semibold text-slate-800">
        Confirm new password
        <input name="confirm" type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} required autoComplete="new-password" className={`${inputCls} h-12 !border-slate-400 !bg-white !text-slate-950 [color-scheme:light]`} />
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-medium leading-5 text-red-800">{error}</p>}
      <button type="submit" disabled={pending || !token} className={`${btnPrimary} min-h-12 w-full bg-emerald-800 text-base hover:bg-emerald-900`}>
        {pending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}
