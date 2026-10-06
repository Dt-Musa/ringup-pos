import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { getUser, updateUser, UserError } from "@/lib/users";
import { updateUserSchema } from "@/lib/validation/user";

type Ctx = { params: Promise<{ id: string }> };

const fail = (e: unknown) => {
  if (e instanceof UserError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
  throw e;
};

// ADMIN only.
export async function GET(_req: Request, { params }: Ctx) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const user = await getUser((await params).id);
  if (!user) return errorResponse("User not found", 404);
  return NextResponse.json({ user });
}

// ADMIN only. Body: any of { name, email, role, active }. `{ "active": false }` deactivates, `true` reactivates.
// Self-deactivation/demotion and removing the last active admin are refused with 409.
export async function PATCH(request: Request, { params }: Ctx) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, updateUserSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return NextResponse.json({ user: await updateUser(auth.user, (await params).id, parsed.data) });
  } catch (e) {
    return fail(e);
  }
}

// ADMIN only. Soft delete = deactivate (users are referenced by sales, refunds and stock movements).
export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ user: await updateUser(auth.user, (await params).id, { active: false }) });
  } catch (e) {
    return fail(e);
  }
}
