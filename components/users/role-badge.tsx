import { ROLE_LABELS, type Role } from "@/lib/permissions";

const STYLES: Record<Role, string> = {
  ADMIN: "border border-violet-200 bg-violet-100 text-violet-800",
  MANAGER: "border border-sky-200 bg-sky-100 text-sky-800",
  CASHIER: "border border-zinc-300 bg-zinc-100 text-zinc-800",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[role]}`}>{ROLE_LABELS[role]}</span>;
}
