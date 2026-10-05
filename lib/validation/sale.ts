import { z } from "zod";

export const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"] as const;

export const saleItemInput = z.object({
  productId: z.string({ error: "productId is required" }).min(1, "productId is required"),
  qty: z
    .number({ error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(100_000, "Quantity is too large"),
});

// NOTE: no prices or totals are accepted from the client – the server computes everything.
export const createSaleSchema = z
  .object({
    items: z.array(saleItemInput).min(1, "Add at least one item to the cart").max(200, "Too many line items"),
    discount: z
      .object({
        type: z.enum(["FIXED", "PERCENT"], { error: "Discount type must be FIXED or PERCENT" }),
        value: z.number({ error: "Discount must be a number" }).int("Discount must be a whole number").min(0, "Discount cannot be negative"),
      })
      .optional(),
    paymentMethod: z.enum(PAYMENT_METHODS, { error: "Choose a payment method" }),
    amountTendered: z.number({ error: "Amount tendered must be a number" }).int("Amount tendered must be a whole number").min(0).max(1_000_000_000).optional(),
    paymentReference: z.string().trim().max(100, "Reference must be 100 characters or fewer").optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.discount?.type === "PERCENT" && v.discount.value > 100) {
      ctx.addIssue({ code: "custom", path: ["discount", "value"], message: "Percentage discount cannot exceed 100%" });
    }
  });

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
