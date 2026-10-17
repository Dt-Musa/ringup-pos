import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "./db";
import { DEFAULT_MAX_IMAGE_BYTES, MIME_BY_EXT, validateImageFile } from "./image-validation";
export { UploadError } from "./image-validation";

// Product images are stored in PostgreSQL so they persist on serverless hosts.
// The existing disk read fallback keeps images uploaded by older deployments working.

const configuredMaxBytes = Number(process.env.MAX_UPLOAD_BYTES);
export const MAX_UPLOAD_BYTES = Number.isFinite(configuredMaxBytes) && configuredMaxBytes > 0 ? configuredMaxBytes : DEFAULT_MAX_IMAGE_BYTES;

export function uploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || "./uploads");
}

export { MIME_BY_EXT } from "./image-validation";

/** Validates (by file signature, not the client-supplied type) and stores the image. Returns the public path. */
export async function saveImage(file: File): Promise<string> {
  const { data: buf, type } = await validateImageFile(file, MAX_UPLOAD_BYTES);
  const name = `${randomUUID()}.${type.ext}`;
  await prisma.productImage.create({
    data: { id: name.slice(0, -type.ext.length - 1), data: buf, mime: type.mime },
  });
  return `/uploads/${name}`;
}

export async function readImage(name: string): Promise<{ data: Buffer; mime: string } | null> {
  const m = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.exec(name);
  if (!m) return null;
  const id = name.slice(0, -m[1].length - 1);
  try {
    const stored = await prisma.productImage.findUnique({ where: { id }, select: { data: true, mime: true } });
    if (stored) return { data: Buffer.from(stored.data), mime: stored.mime };
  } catch {
    // Fall through to the legacy disk backend below.
  }
  try {
    return { data: await readFile(path.join(/* turbopackIgnore: true */ uploadDir(), name)), mime: MIME_BY_EXT[m[1]] };
  } catch {
    return null;
  }
}
