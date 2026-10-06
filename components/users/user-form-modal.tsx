"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary, btnSecondary, inputCls, Modal } from "@/components/ui/modal";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/permissions";
import { Field, PASSWORD_HINT, passwordProblem, type FieldErrors } from "./field";
import type { UserRow } from "./types";

export function UserFormModal({ user, isSelf, onClose }: { user?: UserRow; isSelf?: boolean; onClose: () => void }) {
  const router = useRouter();
  const editing = !!user;
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "CASHIER");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    // An invalid password is reported by the API together with any other field errors.
    if (!editing && !passwordProblem(password) && password !== confirm) return setFieldErrors({ confirm: ["Passwords don't match"] });
    setSaving(true);
    const body = editing ? { name, email, ...(isSelf ? {} : { role }) } : { name, email, role, password };
    const res = await fetch(editing ? `/api/users/${user.id}` : "/api/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(data.error ?? "Could not save the user");
      setFieldErrors(data.fieldErrors ?? {});
    }
  }

  const roleChangeWarning = editing && !isSelf && role !== user.role;

  return (
    <Modal title={editing ? `Edit ${user.name}` : "Add user"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <Field label="Full name *" error={fieldErrors.name}>
          <input name="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} maxLength={100} autoComplete="off" required />
        </Field>
        <Field label="Email *" error={fieldErrors.email} hint="Used to sign in. Must be unique.">
          <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} maxLength={254} autoComplete="off" required />
        </Field>
        <Field
          label="Role *"
          error={fieldErrors.role}
          hint={
            isSelf
              ? "You can't change your own role."
              : roleChangeWarning
                ? "Changing the role signs this user out of all devices."
                : "Admin: everything · Manager: all but Users · Cashier: POS and own sales"
          }
        >
          <select name="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputCls} disabled={isSelf}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        {!editing && (
          <>
            <Field label="Initial password *" error={fieldErrors.password} hint={PASSWORD_HINT}>
              <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="new-password" required />
            </Field>
            <Field label="Confirm password *" error={fieldErrors.confirm}>
              <input name="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} autoComplete="new-password" required />
            </Field>
          </>
        )}
        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add user"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
