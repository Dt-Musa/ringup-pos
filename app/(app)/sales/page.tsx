import { PageHeader, Placeholder } from "@/components/page-header";
import { guardPage } from "@/lib/auth";

export default async function Page() {
  await guardPage("/sales");
  return (
    <>
      <PageHeader title="Sales" description="Sales history and refunds" />
      <Placeholder>Sales list, receipts and refunds arrive in a later phase.</Placeholder>
    </>
  );
}
