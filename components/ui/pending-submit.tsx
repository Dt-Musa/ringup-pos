"use client";

import { useFormStatus } from "react-dom";
import { btnPrimary } from "./modal";

export function PendingSubmit({ children, pendingLabel = "Loading…" }: { children: React.ReactNode; pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={btnPrimary}>
      {pending ? pendingLabel : children}
    </button>
  );
}
