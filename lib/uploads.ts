import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Storage backend for product images: local disk under UPLOAD_DIR.
// To move to object storage (S3, Supabase Storage, Vercel Blob…) replace saveImage/readImage only;
// the rest of the app just stores the returned "/uploads/<uuid>.<ext>" path.

export const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES) || 2 * 1024 * 1024;

export function uploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.UPLOAD_DIR || "./uploads");
}

const TYPES: { ext: "jpg" | "png" | "webp" | "gif"; mime: string; test: (b: Buffer) => boolean }[] = [
  { ext: "jpg", mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", mime: "image/gif", test: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  {
    ext: "webp",
    mime: "image/webp",
    test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(TYPES.map((t) => [t.ext, t.mime]));

export class UploadError extends Error {}

/** Validates (by file signature, not the client-supplied type) and stores the image. Returns the public path. */
export async function saveImage(file: File): Promise<string> {
  if (file.size === 0) throw new UploadError("The file is empty");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`Image is too large (max ${(MAX_UPLOAD_BYTES / 1024 / 1024).toFixed(1)} MB)`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const type = TYPES.find((t) => t.test(buf));
  if (!type) throw new UploadError("Unsupported file type. Use a JPG, PNG, WebP or GIF image");
  const name = `${randomUUID()}.${type.ext}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, name), buf);
  return `/uploads/${name}`;
}

export async function readImage(name: string): Promise<{ data: Buffer; mime: string } | null> {
  const m = /^[a-f0-9-]{36}\.(jpg|png|webp|gif)$/.exec(name);
  if (!m) return null;
  try {
    return { data: await readFile(path.join(/* turbopackIgnore: true */ uploadDir(), name)), mime: MIME_BY_EXT[m[1]] };
  } catch {
    return null;
  }
}
