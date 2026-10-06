import { z } from "zod";
import { ROLES } from "@/lib/permissions";

const emptyToUndef = (v: unknown) => (v === "" ? undefined : v);

export const userFields = {
  name: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  // Stored lowercase so uniqueness (and login) is case-insensitive.
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .pipe(z.email("Enter a valid email address").max(254, "Email must be 254 characters or fewer")),
  role: z.enum(ROLES, { error: "Choose a role: Admin, Manager or Cashier" }),
  password: z
    .string({ error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Za-z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    // bcrypt only uses the first 72 bytes; refuse longer passwords instead of silently truncating them
    .refine((v) => new TextEncoder().encode(v).length <= 72, "Password is too long (max 72 bytes)"),
  active: z.boolean({ error: "Active must be true or false" }),
};

export const createUserSchema = z.object({
  name: userFields.name,
  email: userFields.email,
  role: userFields.role,
  password: userFields.password,
});

export const updateUserSchema = z
  .object({
    name: userFields.name,
    email: userFields.email,
    role: userFields.role,
    active: userFields.active,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const resetPasswordSchema = z.object({ password: userFields.password });

export const listUsersSchema = z.object({
  q: z.preprocess(emptyToUndef, z.string().trim().max(100, "Search is too long").optional()),
  role: z.preprocess(emptyToUndef, z.enum(ROLES, { error: "Unknown role" }).optional()),
  status: z.preprocess(emptyToUndef, z.enum(["active", "inactive", "all"], { error: "Unknown status" }).default("all")),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersInput = z.infer<typeof listUsersSchema>;
