import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Receipt, toReceiptSale } from "@/components/receipt";
import { guardPage } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { saleDetailInclude } from "@/lib/sales-query";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await guardPage("/sales");
  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id }, include: saleDetailInclude });
  // cashiers can only open their own receipts
  if (!sale || (user.role === "CASHIER" && sale.cashierId !== user.id)) notFound();

  return (
    <div>
      <div className="no-print mx-auto mb-6 flex max-w-[340px] items-center justify-between">
        <Link href="/sales" className="text-sm text-emerald-700 hover:underline">
          ← Back to sales
        </Link>
        <PrintButton className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700" />
      </div>
      <Receipt sale={toReceiptSale(sale)} />
    </div>
  );
}
