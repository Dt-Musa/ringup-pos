"use client";

import { useState } from "react";
import { RefundModal, type RefundSaleInfo } from "./refund-modal";

export function RefundButton({ sale }: { sale: RefundSaleInfo }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
        Refund / return…
      </button>
      {open && <RefundModal sale={sale} onClose={() => setOpen(false)} />}
    </>
  );
}
