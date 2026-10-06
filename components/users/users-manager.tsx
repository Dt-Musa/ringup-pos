"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { btnPrimary } from "@/components/ui/modal";
import { formatDate, formatDateTime } from "@/lib/format";
import { ResetPasswordModal } from "./reset-password-modal";
import { RoleBadge } from "./role-badge";
import { UserFormModal } from "./user-form-modal";
import type { UserRow } from "./types";

type ModalState = null | { kind: "form"; user?: UserRow } | { kind: "password"; user: UserRow };

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleActive(u: UserRow) {
    if (u.active && !window.confirm(`Deactivate ${u.name}? They will be signed out and can't sign in until reactivated. Their sales history is kept.`)) return;
    setBusyId(u.id);
    setError(null);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    setBusyId(null);
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Could not update the user");
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={() => setModal({ kind: "form" })} className={btnPrimary}>
          + Add user
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="users-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Last login</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-500">
                  No users match your filters.
                </td>
              </tr>
            )}
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className={`border-t border-zinc-100 dark:border-zinc-800 ${u.active ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {isSelf && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">You</span>}
                    </div>
                  </td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600 dark:text-zinc-400">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-zinc-600 dark:text-zinc-400">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <button onClick={() => setModal({ kind: "form", user: u })} className="mr-3 text-emerald-700 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => setModal({ kind: "password", user: u })} className="mr-3 text-emerald-700 hover:underline">
                      Reset password
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      disabled={busyId === u.id || isSelf}
                      title={isSelf ? "You can't deactivate your own account" : undefined}
                      className={`${u.active ? "text-red-600" : "text-emerald-700"} hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline`}
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal?.kind === "form" && (
        <UserFormModal key={modal.user?.id ?? "new"} user={modal.user} isSelf={modal.user?.id === currentUserId} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "password" && <ResetPasswordModal user={modal.user} isSelf={modal.user.id === currentUserId} onClose={() => setModal(null)} />}
    </>
  );
}
