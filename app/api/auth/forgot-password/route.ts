import { NextResponse } from "next/server";
import { errorResponse, parseJson } from "@/lib/api-utils";
import {
  GENERIC_RECOVERY_MESSAGE,
  RecoveryConfigurationError,
  RecoveryDeliveryError,
  requestIp,
  requestPasswordReset,
} from "@/lib/password-recovery";
import { forgotPasswordSchema } from "@/lib/validation/password-recovery";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await parseJson(request, forgotPasswordSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await requestPasswordReset(parsed.data.email, requestIp(request));
    return NextResponse.json({ message: GENERIC_RECOVERY_MESSAGE }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RecoveryConfigurationError) {
      console.error("[password-recovery] email configuration is unavailable");
      return errorResponse("Password recovery is temporarily unavailable. Please try again later.", 503);
    }
    if (error instanceof RecoveryDeliveryError) {
      console.error("[password-recovery] email delivery failed");
      return errorResponse("Password recovery is temporarily unavailable. Please try again later.", 503);
    }
    console.error("[password-recovery] request failed");
    return errorResponse("Password recovery is temporarily unavailable. Please try again later.", 503);
  }
}
