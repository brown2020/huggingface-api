/** Client-side parsing of `/api/hf` errors and demo-mode fallback notices. */

const UNSAFE_PUBLIC_TEXT = /hf_[A-Za-z0-9]{6,}|Bearer\s+\S+|<\s*script/i;

export function isSafePublicText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 300) return false;
  return !UNSAFE_PUBLIC_TEXT.test(trimmed);
}

/**
 * Read a JSON `{ error }` string from the API.
 * Non-JSON bodies and unsafe strings are dropped so provider payloads never render.
 */
export function formatClientError(statusText: string, bodyText: string): string {
  const trimmed = bodyText.trim();
  if (trimmed) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: unknown };
      if (typeof parsed.error === "string" && isSafePublicText(parsed.error)) {
        return parsed.error.trim();
      }
      return "Request failed";
    } catch {
      /* raw provider or proxy body is never shown */
    }
  }
  const fallback = statusText.trim();
  if (fallback && isSafePublicText(fallback)) return fallback;
  return "Request failed";
}

export function demoReasonFromPayload(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as { demoMode?: unknown; demoReason?: unknown };
  if (record.demoMode !== true) return null;
  if (typeof record.demoReason !== "string" || !isSafePublicText(record.demoReason)) {
    return null;
  }
  return record.demoReason.trim();
}

export function demoReasonFromHeaders(headers: Headers): string | null {
  if (headers.get("X-HF-Demo-Mode") !== "true") return null;
  const reason = headers.get("X-HF-Demo-Reason") ?? "";
  if (!isSafePublicText(reason)) return null;
  return reason.trim();
}
