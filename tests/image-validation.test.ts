import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_MAX_IMAGE_BYTES, UploadError, validateImageFile } from "../lib/image-validation";
import { productImagePath } from "../lib/product-images";

const signatures = [
  { name: "photo.jpg", type: "image/jpeg", bytes: [0xff, 0xd8, 0xff, 0x00], ext: "jpg" },
  { name: "photo.png", type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ext: "png" },
  { name: "photo.webp", type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], ext: "webp" },
  { name: "photo.gif", type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ext: "gif" },
] as const;

test("accepts the supported image signatures", async () => {
  for (const sample of signatures) {
    const file = new File([Uint8Array.from(sample.bytes)], sample.name, { type: sample.type });
    const result = await validateImageFile(file);
    assert.equal(result.type.ext, sample.ext);
    assert.equal(result.type.mime, sample.type);
  }
});

test("rejects an empty file and unsupported file signatures", async () => {
  await assert.rejects(() => validateImageFile(new File([], "empty.png", { type: "image/png" })), UploadError);
  await assert.rejects(() => validateImageFile(new File(["not an image"], "bad.png", { type: "image/png" })), UploadError);
});

test("enforces the 2 MB limit and accepts a file exactly at the limit", async () => {
  const oversized = Buffer.alloc(DEFAULT_MAX_IMAGE_BYTES + 1);
  Buffer.from(signatures[1].bytes).copy(oversized);
  await assert.rejects(
    () => validateImageFile(new File([oversized], "large.png", { type: "image/png" })),
    /Image is too large \(max 2\.0 MB\)/,
  );

  const atLimit = Buffer.alloc(DEFAULT_MAX_IMAGE_BYTES);
  Buffer.from(signatures[1].bytes).copy(atLimit);
  assert.equal((await validateImageFile(new File([atLimit], "limit.png", { type: "image/png" }))).data.byteLength, DEFAULT_MAX_IMAGE_BYTES);
});

test("prefers a saved upload while retaining bundled images when no upload exists", () => {
  assert.equal(productImagePath("Bottled Water 500ml", "/uploads/123e4567-e89b-12d3-a456-426614174000.png"), "/uploads/123e4567-e89b-12d3-a456-426614174000.png");
  assert.equal(productImagePath("Bottled Water 500ml", null), "/assets/POS/bottled%20water%20500ml_result_result.webp");
});
