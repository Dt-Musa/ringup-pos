import { PageHeader, Placeholder } from "@/components/page-header";
import { guardPage } from "@/lib/auth";

export default async function Page() {
  await guardPage("/inventory");
  return (
    <>
      <PageHeader title="Inventory" description="Stock levels and movements" />
      <Placeholder>Stock additions, reductions, adjustments and movement history arrive in a later phase.</Placeholder>
    </>
  );
}
