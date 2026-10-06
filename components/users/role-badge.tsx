import { ROLE_LABELS, type Role } from "@/lib/permissions";

const STYLES: Record<Role, string> = {
  ADMIN: "bg-violet-100 text-violet-700",
  MANAGER: "bg-sky-100 text-sky-700",
  CASHIER: "bg-zinc-100 text-zinc-700",
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[role]}`}>{ROLE_LABELS[role]}</span>;
}
