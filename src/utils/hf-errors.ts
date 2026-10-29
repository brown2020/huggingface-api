import { HttpError } from "@/utils/http-error";

/** Shown when Hugging Face reports no credits, HTTP 402, or an exceeded quota. */
export const HF_CREDITS_MESSAGE =
  "The Hugging Face demo is out of credits right now.";

/** Shown when Hugging Face rejects the server token (HTTP 401 or 403). */
export const HF_AUTH_MESSAGE = "The server token is invalid.";

/** Shown when Hugging Face returns HTTP 429. */
export const HF_RATE_MESSAGE =
  "Hugging Face is rate limiting requests. Try again shortly.";

/** Shown when Hugging Face returns HTTP 503 or another 5xx. */
export const HF_UNAVAILABLE_MESSAGE = "Hugging Face is unavailable right now.";

/** Shown when the provider call times out. */
export const HF_TIMEOUT_MESSAGE = "Hugging Face timed out. Try again shortly.";

export const DEMO_DATA_HEADER = "X-HF-Demo-Data";
export const NOTICE_HEADER = "X-HF-Notice";

export type UpstreamFailureKind =
  | "credits"
  | "auth"
  | "rate"
  | "unavailable"
  | "timeout";

export type UpstreamFailure = {
  kind: UpstreamFailureKind;
  /** Status used when the route does not fall back to fixtures. */
  status: number;
  message: string;
  /** Credit failures can return saved fixtures instead of this status. */
  fallbackToFixtures: boolean;
};

const CREDIT_PATTERN = /\bcredits\b|exceeded quota/i;

const TIMEOUT_MESSAGE = /\btimeout\b|\btimed out\b/i;

const TIMEOUT_CODES = new Set([
  "ETIMEDOUT",
  "ABORT_ERR",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

/** Drop provider text that must never reach a client or a header. */
export function scrubPublicErrorText(text: string): string {
  if (/hf_[A-Za-z0-9]{6,}|Bearer\s+\S+/i.test(text)) {
    return "An unexpected error occurred";
  }
  return text;
}

/**
 * Classify a thrown provider error.
 * Reads status and a short slice of the message/body for matching only.
 * The returned message is always one of the fixed sentences above.
 */
export function classifyUpstreamFailure(error: unknown): UpstreamFailure | null {
  if (error instanceof HttpError) return null;

  const status = readStatus(error);
  const text = classificationText(error);

  if (status === 402 || CREDIT_PATTERN.test(text)) {
    return {
      kind: "credits",
      status: 402,
      message: HF_CREDITS_MESSAGE,
      fallbackToFixtures: true,
    };
  }

  if (status === 401 || status === 403) {
    return {
      kind: "auth",
      status,
      message: HF_AUTH_MESSAGE,
      fallbackToFixtures: false,
    };
  }

  if (status === 429) {
    return {
      kind: "rate",
      status: 429,
      message: HF_RATE_MESSAGE,
      fallbackToFixtures: false,
    };
  }

  if (status === 503) {
    return {
      kind: "unavailable",
      status: 503,
      message: HF_UNAVAILABLE_MESSAGE,
      fallbackToFixtures: false,
    };
  }

  if (status === 408 || isTimeout(error)) {
    return {
      kind: "timeout",
      status: 504,
      message: HF_TIMEOUT_MESSAGE,
      fallbackToFixtures: false,
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      kind: "unavailable",
      status: 503,
      message: HF_UNAVAILABLE_MESSAGE,
      fallbackToFixtures: false,
    };
  }

  return null;
}

/** Header-safe copy of a fixed demo reason. */
export function headerSafeReason(reason: string): string {
  return reason.replace(/[\r\n]+/g, " ").slice(0, 240);
}

function readStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const httpStatus = (error as { httpResponse?: { status?: unknown } }).httpResponse
    ?.status;
  if (typeof httpStatus === "number") return httpStatus;
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && status >= 100 && status <= 599) return status;
  return undefined;
}

function classificationText(error: unknown): string {
  const chunks: string[] = [];
  if (typeof error === "string") {
    chunks.push(error.slice(0, 2000));
    return chunks.join("\n");
  }
  if (!error || typeof error !== "object") return "";
  if ("message" in error && typeof error.message === "string") {
    chunks.push(error.message.slice(0, 2000));
  }
  const body = (error as { httpResponse?: { body?: unknown } }).httpResponse?.body;
  appendBodyText(chunks, body);
  return chunks.join("\n");
}

function appendBodyText(chunks: string[], body: unknown) {
  if (typeof body === "string") {
    chunks.push(body.slice(0, 2000));
    return;
  }
  if (!body || typeof body !== "object") return;
  const record = body as Record<string, unknown>;
  for (const key of ["error", "message", "detail"]) {
    const value = record[key];
    if (typeof value === "string") {
      chunks.push(value.slice(0, 2000));
      continue;
    }
    if (
      value &&
      typeof value === "object" &&
      "message" in value &&
      typeof (value as { message: unknown }).message === "string"
    ) {
      chunks.push((value as { message: string }).message.slice(0, 2000));
    }
  }
}

function isTimeout(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 3) return false;
  const name = "name" in error ? String(error.name) : "";
  if (name === "AbortError" || name === "TimeoutError") return true;
  const code = "code" in error ? String(error.code) : "";
  if (TIMEOUT_CODES.has(code)) return true;
  if (error instanceof Error && TIMEOUT_MESSAGE.test(error.message)) return true;
  if ("cause" in error && error.cause && error.cause !== error) {
    return isTimeout(error.cause, depth + 1);
  }
  return false;
}
