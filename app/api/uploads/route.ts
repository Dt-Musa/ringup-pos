import { apiAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/api-utils";
import { NextResponse } from "next/server";
import { saveImage, UploadError } from "@/lib/uploads";

export const runtime = "nodejs";

// ADMIN / MANAGER. multipart/form-data with a single "file" field.
export async function POST(request: Request) {
  const auth = await apiAuth(["ADMIN", "MANAGER"]);
  if (!auth.ok) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return errorResponse("Choose an image file to upload", 400);
  try {
    const path = await saveImage(file);
    return NextResponse.json({ path }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) return errorResponse(e.message, 400);
    throw e;
  }
}
