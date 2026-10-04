import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import type { ZodType, z } from "zod";

export function errorResponse(message: string, status = 400, fieldErrors?: Record<string, string[]>) {
  return NextResponse.json({ error: message, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

/** Validates the JSON body. Returns the typed data or a ready-to-return 400 response. */
export async function parseJson<S extends ZodType>(
  request: Request,
  schema: S,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: NextResponse }> {
  const body = await request.json().catch(() => undefined);
  if (body === undefined || body === null || typeof body !== "object") {
    return { ok: false, response: errorResponse("Request body must be valid JSON", 400) };
  }
  return validate(schema, body);
}

export function validate<S extends ZodType>(schema: S, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true as const, data: result.data as z.infer<S> };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  const first = result.error.issues[0];
  return { ok: false as const, response: errorResponse(first.message, 400, fieldErrors) };
}

export function isUniqueViolation(e: unknown, field?: string) {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") return false;
  if (!field) return true;
  const target = (e.meta?.target as string[] | string | undefined) ?? [];
  return Array.isArray(target) ? target.includes(field) : String(target).includes(field);
}
