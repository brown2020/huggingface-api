import { describe, expect, it } from "vitest";
import { HttpError } from "./http-error";
import {
  imageResponseContentType,
  MAX_IMAGE_BYTES,
  requireImageFile,
} from "./image-file";

describe("requireImageFile", () => {
  it("rejects a non-file field", () => {
    expect(() => requireImageFile("not-a-file")).toThrow(HttpError);
    try {
      requireImageFile("not-a-file");
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).status).toBe(400);
    }
  });

  it("rejects disallowed and oversized files", () => {
    const text = new File([new Uint8Array([1])], "notes.txt", { type: "text/plain" });
    expect(() => requireImageFile(text)).toThrow(/Unsupported image type/);

    const huge = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.png", {
      type: "image/png",
    });
    expect(() => requireImageFile(huge)).toThrow(/too large/);
  });

  it("accepts a small png", () => {
    const png = new File([new Uint8Array([1, 2, 3])], "dot.png", { type: "image/png" });
    expect(requireImageFile(png)).toBe(png);
  });
});

describe("imageResponseContentType", () => {
  it("keeps known image types and falls back to png", () => {
    expect(imageResponseContentType("image/jpeg")).toBe("image/jpeg");
    expect(imageResponseContentType("image/webp; charset=binary")).toBe("image/webp");
    expect(imageResponseContentType("application/octet-stream")).toBe("image/png");
    expect(imageResponseContentType(undefined)).toBe("image/png");
  });
});
