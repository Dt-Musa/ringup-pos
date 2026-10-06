import { Sidebar } from "@/components/nav";
import { requireUser } from "@/lib/auth";
import { navFor } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      <Sidebar items={navFor(user.role)} userName={user.name} role={user.role} />
      <main className="min-w-0 flex-1 overflow-x-hidden bg-zinc-50 px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8 dark:bg-zinc-950">{children}</main>
    </div>
  );
}
