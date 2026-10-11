import { NextResponse } from "next/server";
import { errorResponse, parseJson } from "@/lib/api-utils";
import { consumePasswordReset } from "@/lib/password-recovery";
import { resetPasswordRequestSchema } from "@/lib/validation/password-recovery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJson(request, resetPasswordRequestSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const consumed = await consumePasswordReset(parsed.data.token, parsed.data.password);
    if (!consumed) return errorResponse("This reset link is invalid or has expired.", 400);
    return NextResponse.json({ message: "Your password has been reset. You can now sign in." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[password-recovery] reset failed");
    return errorResponse("Password reset is temporarily unavailable. Please try again later.", 503);
  }
}
