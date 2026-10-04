import { z } from "zod";

const positiveInt = (label: string, max = 10_000_000) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(1, `${label} must be at least 1`)
    .max(max, `${label} is too large`);

const reason = (required: boolean) => {
  const base = z.string({ error: "Reason is required" }).trim().max(300, "Reason must be 300 characters or fewer");
  return required ? base.min(3, "Please give a reason (at least 3 characters)") : base.optional();
};

const productId = z.string({ error: "Choose a product" }).min(1, "Choose a product");

export const stockActionSchema = z.discriminatedUnion(
  "action",
  [
    z.object({
      action: z.literal("ADD"),
      productId,
      qty: positiveInt("Quantity"),
      reason: reason(false),
      unitCost: z.number({ error: "Unit cost must be a number" }).int("Unit cost must be a whole number").min(0).max(1_000_000_000).optional(),
      updateBuyingCost: z.boolean().optional(),
    }),
    z.object({
      action: z.literal("REDUCE"),
      productId,
      qty: positiveInt("Quantity"),
      reason: reason(true),
    }),
    z.object({
      action: z.literal("ADJUST"),
      productId,
      countedQty: z
        .number({ error: "Counted quantity must be a number" })
        .int("Counted quantity must be a whole number")
        .min(0, "Counted quantity cannot be negative")
        .max(10_000_000, "Counted quantity is too large"),
      reason: reason(true),
    }),
  ],
  { error: "action must be ADD, REDUCE or ADJUST" },
);
export type StockActionInput = z.infer<typeof stockActionSchema>;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");
const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);

export const listInventorySchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(100).optional()),
  categoryId: z.preprocess(emptyToUndef, z.string().optional()),
  status: z.preprocess(emptyToUndef, z.enum(["all", "low", "out"]).default("all")),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const listMovementsSchema = z.object({
  productId: z.preprocess(emptyToUndef, z.string().optional()),
  type: z.preprocess(emptyToUndef, z.enum(["SALE", "ADDITION", "REDUCTION", "ADJUSTMENT", "RETURN"]).optional()),
  userId: z.preprocess(emptyToUndef, z.string().optional()),
  from: z.preprocess(emptyToUndef, date.optional()),
  to: z.preprocess(emptyToUndef, date.optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});
