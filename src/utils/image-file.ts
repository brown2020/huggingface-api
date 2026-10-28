import { HttpError } from "@/utils/http-error";

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function imageMediaType(type: string | undefined): string | null {
  const base = (type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return ALLOWED_IMAGE_TYPES.has(base) ? base : null;
}

/** Accept a real image file within the size and MIME allowlist. */
export function requireImageFile(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || value.size <= 0) {
    throw new HttpError(400, "Image file is required");
  }
  if (value.size > MAX_IMAGE_BYTES) {
    throw new HttpError(400, "Image file is too large");
  }
  const mediaType = imageMediaType(value.type);
  if (!mediaType) {
    throw new HttpError(400, "Unsupported image type");
  }
  return value;
}

/** Use the blob type when it is a known image type; otherwise PNG. */
export function imageResponseContentType(blobType: string | undefined): string {
  return imageMediaType(blobType) ?? "image/png";
}
