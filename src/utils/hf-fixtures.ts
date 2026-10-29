/**
 * Labeled fixtures for Hugging Face / Replicate demo responses.
 * Used when HF_USE_FIXTURES=true (off by default) and when a live HF call fails closed.
 * Fixtures cannot prove live provider quality, latency, or credit metering.
 */

export const FIXTURE_COMPLETION =
  "[fixture] Hugging Face Inference Providers demo completion — no live HF call.";

export const FIXTURE_TRANSLATION =
  "[fixture] Bonjour le monde — translation fixture; no live HF call.";

export const FIXTURE_IMAGE_CAPTION =
  "[fixture] A placeholder caption for the uploaded image — Replicate LLaVA not called.";

/** 1×1 PNG (transparent) as ArrayBuffer for text-to-image fixture. */
export function fixturePngBuffer(): Buffer {
  // Minimal valid 1x1 PNG
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
}

export function hfFixturesEnabled(): boolean {
  return process.env.HF_USE_FIXTURES === "true";
}

/** Saved samples shipped with the app. Credit failures use these when present. */
export function savedFixturesExist(): boolean {
  return (
    FIXTURE_COMPLETION.length > 0 &&
    FIXTURE_TRANSLATION.length > 0 &&
    FIXTURE_IMAGE_CAPTION.length > 0 &&
    fixturePngBuffer().byteLength > 0
  );
}
