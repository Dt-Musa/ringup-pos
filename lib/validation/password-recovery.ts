import { z } from "zod";
import { userFields } from "./user";

export const forgotPasswordSchema = z.object({ email: userFields.email });

export const resetPasswordRequestSchema = z.object({
  token: z.string().trim().min(1, "Reset link is missing").max(256, "Reset link is invalid"),
  password: userFields.password,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
