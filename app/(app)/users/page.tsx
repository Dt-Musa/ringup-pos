import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function UsersPage() {
  await guardPage("/users");
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  return (
    <>
      <PageHeader title="Users" description="Admin only. Create/edit/deactivate arrives in a later phase." />
      <div className="overflow-hidden rounded-lg bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 text-xs uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="px-4 py-2">{u.name}</td>
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.role}</td>
                <td className="px-4 py-2">{u.active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
