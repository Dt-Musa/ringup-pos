import { z } from "zod";

const money = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number (UGX has no decimals)`)
    .min(0, `${label} cannot be negative`)
    .max(1_000_000_000, `${label} is too large`);

const qty = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} cannot be negative`)
    .max(10_000_000, `${label} is too large`);

export const IMAGE_PATH_RE = /^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp|gif)$/;

export const productFields = {
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  sku: z
    .string({ error: "SKU is required" })
    .trim()
    .toUpperCase()
    .min(2, "SKU must be at least 2 characters")
    .max(32, "SKU must be 32 characters or fewer")
    .regex(/^[A-Z0-9._-]+$/, "SKU may only contain letters, numbers, dots, dashes and underscores"),
  categoryId: z.string({ error: "Category is required" }).min(1, "Category is required"),
  buyingCost: money("Buying cost"),
  sellingPrice: money("Selling price"),
  stockQty: qty("Stock quantity"),
  minStock: qty("Minimum stock"),
  image: z.string().regex(IMAGE_PATH_RE, "Invalid image path").nullable(),
  active: z.boolean({ error: "Active must be true or false" }),
};

export const createProductSchema = z.object({
  name: productFields.name,
  sku: productFields.sku,
  categoryId: productFields.categoryId,
  buyingCost: productFields.buyingCost,
  sellingPrice: productFields.sellingPrice,
  stockQty: productFields.stockQty.default(0),
  minStock: productFields.minStock.default(0),
  image: productFields.image.optional().default(null),
  active: productFields.active.optional().default(true),
});

export const updateProductSchema = z
  .object({
    name: productFields.name,
    sku: productFields.sku,
    categoryId: productFields.categoryId,
    buyingCost: productFields.buyingCost,
    sellingPrice: productFields.sellingPrice,
    stockQty: productFields.stockQty,
    minStock: productFields.minStock,
    image: productFields.image,
    active: productFields.active,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const listProductsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "all"]).default("all"),
  stock: z.enum(["low", "out"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const categorySchema = z.object({
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(50, "Name must be 50 characters or fewer"),
});
