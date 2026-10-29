import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DEMO_PASSWORD_MESSAGE } from "@/utils/demo-password";
import { hfFixturesEnabled } from "@/utils/hf-fixtures";

/** Shared header for `HF_API_SECRET`. Also accepts `Authorization: Bearer`. */
export const API_KEY_HEADER = "x-hf-api-key";

const WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;
/** Multipart overhead sits above the image-byte cap. */
export const MAX_BODY_BYTES = 5 * 1024 * 1024;

type HitWindow = { hits: number[] };

const windows = new Map<string, HitWindow>();
let maxRequests = DEFAULT_MAX_REQUESTS;

export function resetApiGuardForTests() {
  windows.clear();
  maxRequests = DEFAULT_MAX_REQUESTS;
}

export function setRateLimitMaxForTests(max: number) {
  maxRequests = max;
  windows.clear();
}

function jsonError(status: number, error: string, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function tokensMatch(supplied: string, secret: string): boolean {
  return timingSafeEqual(digest(supplied), digest(secret));
}

function suppliedApiKey(request: Request): string | null {
  const header = request.headers.get(API_KEY_HEADER)?.trim();
  if (header) return header;
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function rateLimit(request: Request): Response | null {
  const now = Date.now();
  const key = clientAddress(request);
  const recent = (windows.get(key)?.hits ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= maxRequests) {
    const retryAfter = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    windows.set(key, { hits: recent });
    return jsonError(429, "Too many requests", { "Retry-After": String(retryAfter) });
  }
  recent.push(now);
  windows.set(key, { hits: recent });
  return null;
}

function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  if (!originHost) return false;
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (host) return host === originHost;
  try {
    return new URL(request.url).host === originHost;
  } catch {
    return false;
  }
}

function authorize(request: Request): Response | null {
  const secret = process.env.HF_API_SECRET?.trim() ?? "";
  if (!secret) {
    if (hfFixturesEnabled()) return null;
    return jsonError(503, "Live inference is disabled");
  }
  const supplied = suppliedApiKey(request);
  if (!supplied || !tokensMatch(supplied, secret)) {
    return jsonError(401, DEMO_PASSWORD_MESSAGE);
  }
  return null;
}

function bodyTooLarge(request: Request): Response | null {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const size = Number(raw);
  if (!Number.isFinite(size) || size < 0 || size > MAX_BODY_BYTES) {
    return jsonError(413, "Request body is too large");
  }
  return null;
}

/**
 * Reject abusive calls before any provider work.
 * Missing `HF_API_SECRET` allows fixture mode only.
 */
export function guardApiRequest(request: Request): Response | null {
  return (
    rateLimit(request) ??
    (originAllowed(request) ? null : jsonError(403, "Cross-origin request denied")) ??
    authorize(request) ??
    bodyTooLarge(request)
  );
}
