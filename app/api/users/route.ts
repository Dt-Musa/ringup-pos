import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson, validate } from "@/lib/api-utils";
import { createUser, listUsers, UserError } from "@/lib/users";
import { createUserSchema, listUsersSchema } from "@/lib/validation/user";

// ADMIN only (also enforced by the proxy). ?q= (name/email) &role=ADMIN|MANAGER|CASHIER &status=active|inactive|all
export async function GET(request: Request) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const parsed = validate(listUsersSchema, Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.ok) return parsed.response;
  return NextResponse.json(await listUsers(parsed.data));
}

// ADMIN only. Body: { name, email, role, password } – the password is hashed with bcrypt and never returned.
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, createUserSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const user = await createUser(parsed.data);
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof UserError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
    throw e;
  }
}
