"use client";

import { btnDanger, btnPrimary, btnSecondary, Modal } from "./modal";

/** In-app replacement for window.confirm(), styled like the other dialogs. */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  danger,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="space-y-4">
        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="text-sm text-zinc-600 dark:text-zinc-300">{children}</div>
        <div className="flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} disabled={busy} className={btnSecondary}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className={danger ? btnDanger : btnPrimary} autoFocus>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
