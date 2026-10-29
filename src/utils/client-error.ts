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

export type DemoPresentation = {
  demoData: boolean;
  notice: string | null;
};

export function demoPresentationFromPayload(data: unknown): DemoPresentation {
  if (!data || typeof data !== "object") return { demoData: false, notice: null };
  const record = data as { demoData?: unknown; notice?: unknown };
  const notice =
    typeof record.notice === "string" && isSafePublicText(record.notice)
      ? record.notice.trim()
      : null;
  return { demoData: record.demoData === true, notice };
}

export function demoPresentationFromHeaders(headers: Headers): DemoPresentation {
  const raw = headers.get("X-HF-Notice") ?? "";
  const notice = isSafePublicText(raw) ? raw.trim() : null;
  return { demoData: headers.get("X-HF-Demo-Data") === "true", notice };
}
