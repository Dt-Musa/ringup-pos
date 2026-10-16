import { SHOP_NAME } from "@/lib/config";
import { formatDateTime, formatUGX, PAYMENT_LABELS } from "@/lib/format";
import { BrandLogo } from "@/components/brand";

export type ReceiptSale = {
  receiptNo: string;
  createdAt: string | Date;
  cashierName: string;
  status: string;
  paymentMethod: string;
  paymentReference: string | null;
  amountTendered: number | null;
  subtotal: number;
  discount: number;
  total: number;
  items: { id: string; name: string; sku: string; qty: number; unitPrice: number; lineTotal: number }[];
  refundedAmount?: number;
  refunds?: { id: string; createdAt: string | Date; amount: number; reason: string | null; method: string | null; items: { name: string; qty: number; amount: number }[] }[];
};

/** Narrow, thermal-printer-friendly receipt. Wrap in a `.print-area` to print only this. */
export function Receipt({ sale }: { sale: ReceiptSale }) {
  const change = sale.amountTendered !== null ? sale.amountTendered - sale.total : null;
  return (
    <div className="print-area mx-auto w-full max-w-[340px] bg-white p-5 font-mono text-[13px] leading-5 text-black shadow-md" data-testid="receipt">
      <div className="text-center">
        <div className="mb-2 flex justify-center">
          <BrandLogo width={150} />
        </div>
        {SHOP_NAME.trim().toLowerCase() !== "ringup" && (
          <div className="text-xl font-bold tracking-wide">{SHOP_NAME}</div>
        )}
        <div className="text-xs">Thank you for shopping with us</div>
      </div>
      <div className="my-3 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Receipt</span>
        <span className="font-bold">{sale.receiptNo}</span>
      </div>
      <div className="flex justify-between">
        <span>Date</span>
        <span>{formatDateTime(sale.createdAt)}</span>
      </div>
      <div className="flex justify-between">
        <span>Cashier</span>
        <span>{sale.cashierName}</span>
      </div>
      {sale.status !== "COMPLETED" && (
        <div className="mt-1 text-center font-bold uppercase">*** {sale.status.replace("_", " ")} ***</div>
      )}
      <div className="my-3 border-t border-dashed border-black" />
      <table className="w-full">
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.id} className="align-top">
              <td className="pr-2">
                <div>{i.name}</div>
                <div className="text-xs text-zinc-600">
                  {i.qty} × {formatUGX(i.unitPrice)}
                </div>
              </td>
              <td className="whitespace-nowrap text-right">{formatUGX(i.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="my-3 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatUGX(sale.subtotal)}</span>
      </div>
      {sale.discount > 0 && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{formatUGX(sale.discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-base font-bold">
        <span>TOTAL</span>
        <span>{formatUGX(sale.total)}</span>
      </div>
      <div className="my-3 border-t border-dashed border-black" />
      <div className="flex justify-between">
        <span>Payment</span>
        <span>{PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
      </div>
      {sale.paymentReference && (
        <div className="flex justify-between">
          <span>Ref</span>
          <span>{sale.paymentReference}</span>
        </div>
      )}
      {sale.amountTendered !== null && (
        <>
          <div className="flex justify-between">
            <span>Tendered</span>
            <span>{formatUGX(sale.amountTendered)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Change</span>
            <span>{formatUGX(change ?? 0)}</span>
          </div>
        </>
      )}
      {sale.refunds && sale.refunds.length > 0 && (
        <>
          <div className="my-3 border-t border-dashed border-black" />
          <div className="font-bold">REFUNDS</div>
          {sale.refunds.map((r) => (
            <div key={r.id} className="mt-1">
              <div className="flex justify-between text-xs">
                <span>{formatDateTime(r.createdAt)}</span>
                <span className="font-bold">-{formatUGX(r.amount)}</span>
              </div>
              {r.items.map((i, idx) => (
                <div key={idx} className="text-xs text-zinc-600">
                  {i.qty} × {i.name}
                </div>
              ))}
              {r.reason && <div className="text-xs">Reason: {r.reason}</div>}
              {r.method && <div className="text-xs">Paid back: {r.method}</div>}
            </div>
          ))}
          <div className="mt-2 flex justify-between text-base font-bold">
            <span>NET TOTAL</span>
            <span>{formatUGX(sale.total - (sale.refundedAmount ?? 0))}</span>
          </div>
        </>
      )}
      <div className="mt-4 text-center text-xs">Goods sold are not returnable without a receipt</div>
    </div>
  );
}

export function toReceiptSale(s: {
  receiptNo: string;
  createdAt: Date | string;
  status: string;
  paymentMethod: string;
  paymentReference: string | null;
  amountTendered: number | null;
  subtotal: number;
  discount: number;
  total: number;
  cashier: { name: string };
  items: { id: string; qty: number; unitPrice: number; lineTotal: number; product: { name: string; sku: string } }[];
  refundedAmount?: number;
  refunds?: {
    id: string;
    createdAt: Date | string;
    amount: number;
    reason: string | null;
    method: string | null;
    items: { qty: number; amount: number; saleItem: { product: { name: string } } }[];
  }[];
}): ReceiptSale {
  return {
    receiptNo: s.receiptNo,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : s.createdAt.toISOString(),
    cashierName: s.cashier.name,
    status: s.status,
    paymentMethod: s.paymentMethod,
    paymentReference: s.paymentReference,
    amountTendered: s.amountTendered,
    subtotal: s.subtotal,
    discount: s.discount,
    total: s.total,
    items: s.items.map((i) => ({ id: i.id, name: i.product.name, sku: i.product.sku, qty: i.qty, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
    refundedAmount: s.refundedAmount ?? 0,
    refunds: s.refunds?.map((r) => ({
      id: r.id,
      createdAt: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
      amount: r.amount,
      reason: r.reason,
      method: r.method,
      items: r.items.map((i) => ({ name: i.saleItem.product.name, qty: i.qty, amount: i.amount })),
    })),
  };
}
