import { PageHeader } from "@/components/page-header";
import { UserFilters } from "@/components/users/filters";
import { UsersManager } from "@/components/users/users-manager";
import type { UserRow } from "@/components/users/types";
import { guardPage } from "@/lib/auth";
import { listUsers } from "@/lib/users";
import { listUsersSchema } from "@/lib/validation/user";

type SP = Record<string, string | string[] | undefined>;

export default async function UsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await guardPage("/users"); // ADMIN only
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = listUsersSchema.safeParse(flat);
  const filters = parsed.success ? parsed.data : listUsersSchema.parse({});

  const { users, total } = await listUsers(filters);
  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Users"
        description="Add staff, set their role, reset passwords and deactivate accounts. Users are never deleted, so sales history stays intact."
      />
      <UserFilters />
      <UsersManager users={rows} currentUserId={me.id} />
      <div className="mt-4 text-sm text-zinc-500">
        <span data-testid="users-count">
          {total} user{total === 1 ? "" : "s"}
        </span>
      </div>
    </>
  );
}
