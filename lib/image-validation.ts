export const DEFAULT_MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type ImageFile = {
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type SupportedImageType = { ext: "jpg" | "png" | "webp" | "gif"; mime: string };

const TYPES: (SupportedImageType & { test: (bytes: Buffer) => boolean })[] = [
  { ext: "jpg", mime: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "gif", mime: "image/gif", test: (b) => b.subarray(0, 4).toString("ascii") === "GIF8" },
  { ext: "webp", mime: "image/webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
];

export class UploadError extends Error {}

/** Enforce the size limit and identify supported formats from their file signatures. */
export async function validateImageFile(file: ImageFile, maxBytes = DEFAULT_MAX_IMAGE_BYTES) {
  if (file.size === 0) throw new UploadError("The file is empty");
  if (file.size > maxBytes) {
    throw new UploadError(`Image is too large (max ${(maxBytes / 1024 / 1024).toFixed(1)} MB)`);
  }
  const data = Buffer.from(await file.arrayBuffer());
  const type = TYPES.find((candidate) => candidate.test(data));
  if (!type) throw new UploadError("Unsupported file type. Use a JPG, PNG, WebP or GIF image");
  return { data, type: { ext: type.ext, mime: type.mime } };
}

export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(TYPES.map(({ ext, mime }) => [ext, mime]));
