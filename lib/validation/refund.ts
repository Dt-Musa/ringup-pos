import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);

export const createRefundSchema = z
  .object({
    saleId: z.string({ error: "saleId is required" }).min(1, "saleId is required"),
    fullRefund: z.boolean().optional(),
    items: z
      .array(
        z.object({
          saleItemId: z.string({ error: "saleItemId is required" }).min(1),
          qty: z
            .number({ error: "Quantity must be a number" })
            .int("Quantity must be a whole number")
            .min(1, "Quantity must be at least 1")
            .max(100_000, "Quantity is too large"),
          restock: z.boolean().optional(), // default true: put the goods back into stock
        }),
      )
      .max(200)
      .optional(),
    reason: z.string({ error: "A reason is required" }).trim().min(3, "Please give a reason (at least 3 characters)").max(300, "Reason must be 300 characters or fewer"),
    method: z.preprocess(emptyToUndef, z.string().trim().max(100, "Refund method must be 100 characters or fewer").optional()),
    restockAll: z.boolean().optional(), // used with fullRefund: false = nothing goes back to stock
  })
  .refine((v) => v.fullRefund || (v.items && v.items.length > 0), {
    message: "Choose at least one item to refund, or refund the full sale",
    path: ["items"],
  });
export type CreateRefundInput = z.infer<typeof createRefundSchema>;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

export const listSalesSchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(50).optional()),
  from: z.preprocess(emptyToUndef, date.optional()),
  to: z.preprocess(emptyToUndef, date.optional()),
  cashierId: z.preprocess(emptyToUndef, z.string().optional()),
  paymentMethod: z.preprocess(emptyToUndef, z.enum(["CASH", "MOBILE_MONEY", "CARD", "BANK_TRANSFER"]).optional()),
  status: z.preprocess(emptyToUndef, z.enum(["COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED", "VOIDED"]).optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
