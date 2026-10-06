"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { btnPrimary } from "@/components/ui/modal";
import { formatDate, formatDateTime } from "@/lib/format";
import { ResetPasswordModal } from "./reset-password-modal";
import { RoleBadge } from "./role-badge";
import { UserFormModal } from "./user-form-modal";
import type { UserRow } from "./types";

type ModalState = null | { kind: "form"; user?: UserRow } | { kind: "password"; user: UserRow } | { kind: "toggle"; user: UserRow };

const actionCls = "text-emerald-700 hover:underline";

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function openToggle(u: UserRow) {
    setToggleError(null);
    setModal({ kind: "toggle", user: u });
  }

  async function toggleActive(u: UserRow) {
    setBusy(true);
    setToggleError(null);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    setBusy(false);
    if (res.ok) {
      setModal(null);
      router.refresh();
    } else {
      setToggleError((await res.json().catch(() => ({}))).error ?? "Could not update the user");
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={() => setModal({ kind: "form" })} className={btnPrimary}>
          + Add user
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm" data-testid="users-table">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="hidden px-3 py-2 xl:table-cell">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="hidden px-3 py-2 xl:table-cell">Created</th>
              <th className="px-3 py-2">Last login</th>
              <th className="px-3 py-2 text-right">Actions</th>
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
                  {/* w-full + max-w-0: this column absorbs the spare width and truncates instead of widening the table */}
                  <td className="w-full max-w-0 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-500 dark:bg-zinc-800">
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-medium" title={u.name}>
                            {u.name}
                          </span>
                          {isSelf && <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">You</span>}
                        </div>
                        {/* email moves under the name below xl, where the Email column is hidden */}
                        <div className="truncate text-xs text-zinc-500 xl:hidden" title={u.email}>
                          {u.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 xl:table-cell">
                    <div className="max-w-64 truncate" title={u.email}>
                      {u.email}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-600"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-600 xl:table-cell dark:text-zinc-400">{formatDate(u.createdAt)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <button onClick={() => setModal({ kind: "form", user: u })} className={actionCls} aria-label={`Edit ${u.name}`}>
                        Edit
                      </button>
                      <button
                        onClick={() => setModal({ kind: "password", user: u })}
                        className={actionCls}
                        title="Reset password"
                        aria-label={`Reset password for ${u.name}`}
                      >
                        Password
                      </button>
                      <button
                        onClick={() => openToggle(u)}
                        disabled={isSelf}
                        title={isSelf ? "You can't deactivate your own account" : undefined}
                        aria-label={`${u.active ? "Deactivate" : "Reactivate"} ${u.name}`}
                        className={`${u.active ? "text-red-600" : "text-emerald-700"} hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40`}
                      >
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
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
      {modal?.kind === "toggle" && (
        <ConfirmModal
          title={modal.user.active ? `Deactivate ${modal.user.name}?` : `Reactivate ${modal.user.name}?`}
          confirmLabel={modal.user.active ? "Deactivate" : "Reactivate"}
          danger={modal.user.active}
          busy={busy}
          error={toggleError}
          onConfirm={() => toggleActive(modal.user)}
          onClose={() => setModal(null)}
        >
          {modal.user.active ? (
            <p>
              <span className="break-all font-medium">{modal.user.email}</span> will be signed out of all devices and won&apos;t be able to sign in until reactivated.
              Their sales history is kept.
            </p>
          ) : (
            <p>
              <span className="break-all font-medium">{modal.user.email}</span> will be able to sign in again with their current password.
            </p>
          )}
        </ConfirmModal>
      )}
    </>
  );
}
