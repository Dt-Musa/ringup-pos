import { Sidebar } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar items={navFor(user.role)} userName={user.name} role={user.role} />
      <main className="flex-1 overflow-x-auto bg-zinc-50 p-8 dark:bg-zinc-950">{children}</main>
    </div>
  );
}
