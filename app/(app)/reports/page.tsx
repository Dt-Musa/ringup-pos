import { PageHeader, Placeholder } from "@/components/page-header";
import { guardPage } from "@/lib/auth";

export default async function Page() {
  await guardPage("/reports");
  return (
    <>
      <PageHeader title="Reports" description="Revenue, profit and stock reports" />
      <Placeholder>Reports arrive in a later phase. Visible to Admin and Manager only.</Placeholder>
    </>
  );
}
