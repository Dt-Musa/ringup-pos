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

const optionalText = (max: number) => z.string().trim().max(max).transform((value) => value || null).optional();

export const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required").max(100),
  phone: optionalText(40),
  email: z.union([z.string().trim().email("Enter a valid email address").max(254), z.literal("")]).optional().transform((value) => value || null),
  address: optionalText(300),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1, "Choose a supplier"),
  notes: optionalText(500),
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: positiveInt("Quantity"),
    unitCost: z.number().int().min(0).max(1_000_000_000),
  })).min(1, "Add at least one product").max(100),
});

export const purchaseOrderActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["ORDER", "CANCEL"]) }),
  z.object({
    action: z.literal("RECEIVE"),
    invoiceNumber: z.string().trim().min(1, "Invoice number is required").max(100),
    invoiceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid invoice date").refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, "Enter a valid invoice date"),
    invoiceAmount: z.number().int().min(0).max(2_000_000_000),
  }),
]);
