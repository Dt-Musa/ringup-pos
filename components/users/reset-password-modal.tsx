"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import { Field, PASSWORD_HINT, passwordProblem, type FieldErrors } from "./field";
import type { UserRow } from "./types";

export function ResetPasswordModal({ user, isSelf, onClose }: { user: UserRow; isSelf?: boolean; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const problem = passwordProblem(password);
    if (problem) return setFieldErrors({ password: [problem] });
    if (password !== confirm) return setFieldErrors({ confirm: ["Passwords don't match"] });
    setSaving(true);
    const res = await fetch(`/api/users/${user.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
    } else {
      setError(data.error ?? "Could not reset the password");
      setFieldErrors(data.fieldErrors ?? {});
    }
  }

  if (done) {
    return (
      <Modal title="Password reset" onClose={onClose}>
        <p role="status" className="rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {isSelf
            ? "Your password was changed. Other devices you were signed in on have been signed out."
            : `${user.name}'s password was changed and they have been signed out of all devices. Share the new password with them securely.`}
        </p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className={btnPrimary}>
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Reset password – ${user.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <p className="text-sm text-zinc-500">
          {isSelf ? "Set a new password for your account." : `Set a new password for ${user.email}. They will be signed out of all devices.`}
        </p>
        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="New password *" error={fieldErrors.password} hint={PASSWORD_HINT}>
          <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="new-password" required />
        </Field>
        <Field label="Confirm new password *" error={fieldErrors.confirm}>
          <input name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="new-password" required />
        </Field>
        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : "Reset password"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
