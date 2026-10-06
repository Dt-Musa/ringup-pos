import { NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { getSession } from "@/lib/session";
import { resetPassword, UserError } from "@/lib/users";
import { resetPasswordSchema } from "@/lib/validation/user";

// ADMIN only. Body: { password }. Signs the user out of every existing session (sessionVersion is bumped).
// An admin resetting their OWN password keeps the current session (it is re-issued with the new version).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await apiAuth(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const parsed = await parseJson(request, resetPasswordSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;
  try {
    const { user, sessionVersion } = await resetPassword(id, parsed.data.password);
    if (id === auth.user.id) {
      const session = await getSession();
      session.sessionVersion = sessionVersion;
      await session.save();
    }
    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof UserError) return errorResponse(e.message, e.status, e.fieldErrors, e.code);
    throw e;
  }
}
