import { PageHeader, Placeholder } from "@/components/page-header";
import { guardPage } from "@/lib/auth";

export default async function Page() {
  await guardPage("/pos");
  return (
    <>
      <PageHeader title="POS" description="Ring up sales" />
      <Placeholder>Product grid, cart, discounts and checkout (Cash / Mobile Money / Card / Bank Transfer) arrive in phase 2.</Placeholder>
    </>
  );
}
