import { InventoryTabs } from "@/components/inventory/tabs";
import { PageHeader } from "@/components/page-header";
import { guardPage } from "@/lib/auth";

export default async function InventoryLayout({ children }: { children: React.ReactNode }) {
  await guardPage("/inventory"); // ADMIN / MANAGER only
  return (
    <>
      <PageHeader title="Inventory" description="Stock levels, valuation, stock actions and movement history." />
      <InventoryTabs />
      {children}
    </>
  );
}
