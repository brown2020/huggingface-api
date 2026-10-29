import { describe, expect, it } from "vitest";
import { HttpError } from "./http-error";
import {
  HF_AUTH_MESSAGE,
  HF_CREDITS_MESSAGE,
  HF_RATE_MESSAGE,
  HF_UNAVAILABLE_MESSAGE,
  classifyUpstreamFailure,
  scrubPublicErrorText,
} from "./hf-errors";

const PLANTED_TOKEN = "hf_TESTTOKENSHOULDNOTLEAK";

function providerError(
  status: number,
  bodyText: string,
  extras?: { name?: string; code?: string }
) {
  const error = new Error(`Failed to perform inference: ${bodyText}`);
  error.name = extras?.name ?? "InferenceClientProviderApiError";
  return Object.assign(error, {
    code: extras?.code,
    httpRequest: {
      url: "https://router.huggingface.co/v1/chat/completions",
      method: "POST",
      headers: { Authorization: `Bearer ${PLANTED_TOKEN}` },
    },
    httpResponse: {
      requestId: "req_test",
      status,
      body: { error: bodyText, token: PLANTED_TOKEN },
    },
  });
}

describe("classifyUpstreamFailure", () => {
  it("maps HTTP 402 to the credits message and fixture fallback", () => {
    const failure = classifyUpstreamFailure(providerError(402, "ignored"));
    expect(failure).toEqual({
      kind: "credits",
      status: 402,
      message: HF_CREDITS_MESSAGE,
      fallbackToFixtures: true,
    });
  });

  it("treats a no-credits phrase as credits even when status is 403", () => {
    const failure = classifyUpstreamFailure(
      providerError(403, "You have no remaining credits")
    );
    expect(failure?.kind).toBe("credits");
    expect(failure?.message).toBe(HF_CREDITS_MESSAGE);
    expect(failure?.fallbackToFixtures).toBe(true);
    expect(JSON.stringify(failure)).not.toContain(PLANTED_TOKEN);
  });

  it("reads the credit phrase from the response body when the message is generic", () => {
    const error = providerError(401, "an HTTP error occurred");
    error.httpResponse.body = {
      error: "You have no remaining credits",
      token: PLANTED_TOKEN,
    };
    const failure = classifyUpstreamFailure(error);
    expect(failure?.kind).toBe("credits");
    expect(failure?.message).not.toContain("remaining credits");
    expect(failure?.message).toBe(HF_CREDITS_MESSAGE);
  });

  it("maps 401 and 403 to an invalid server token", () => {
    const unauthorized = classifyUpstreamFailure(providerError(401, "Unauthorized"));
    expect(unauthorized).toMatchObject({
      kind: "auth",
      status: 401,
      message: HF_AUTH_MESSAGE,
      fallbackToFixtures: true,
    });
    const forbidden = classifyUpstreamFailure(providerError(403, "Forbidden"));
    expect(forbidden).toMatchObject({
      kind: "auth",
      status: 403,
      message: HF_AUTH_MESSAGE,
      fallbackToFixtures: true,
    });
    expect(JSON.stringify(unauthorized)).not.toContain(PLANTED_TOKEN);
    expect(JSON.stringify(forbidden)).not.toContain("Bearer");
  });

  it("maps 429 without falling back to fixtures", () => {
    const failure = classifyUpstreamFailure(providerError(429, "slow down"));
    expect(failure).toEqual({
      kind: "rate",
      status: 429,
      message: HF_RATE_MESSAGE,
      fallbackToFixtures: false,
    });
  });

  it("maps 5xx and request timeout to unavailable", () => {
    for (const status of [500, 502, 503, 504]) {
      const failure = classifyUpstreamFailure(providerError(status, "boom"));
      expect(failure).toEqual({
        kind: "unavailable",
        status: 503,
        message: HF_UNAVAILABLE_MESSAGE,
        fallbackToFixtures: false,
      });
    }
    expect(classifyUpstreamFailure(providerError(408, "request timeout"))?.kind).toBe(
      "unavailable"
    );
  });

  it("maps abort and timeout errors without an HTTP status", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(classifyUpstreamFailure(abort)?.message).toBe(HF_UNAVAILABLE_MESSAGE);

    const timedOut = new Error("connect timed out");
    expect(classifyUpstreamFailure(timedOut)?.kind).toBe("unavailable");

    const wrapped = new Error("fetch failed");
    (wrapped as Error & { cause?: unknown }).cause = Object.assign(
      new Error("connect timeout"),
      { code: "UND_ERR_CONNECT_TIMEOUT" }
    );
    expect(classifyUpstreamFailure(wrapped)?.status).toBe(503);
  });

  it("leaves unrelated errors unclassified and ignores HttpError", () => {
    const leaked = new Error(`HF_TOKEN is not set ${PLANTED_TOKEN}`);
    expect(classifyUpstreamFailure(leaked)).toBeNull();
    expect(classifyUpstreamFailure(new HttpError(400, "Invalid JSON body"))).toBeNull();
    expect(classifyUpstreamFailure(providerError(400, "model not supported"))).toBeNull();
  });

  it("scrubs token-like text out of public error strings", () => {
    expect(scrubPublicErrorText(`bad ${PLANTED_TOKEN}`)).toBe(
      "An unexpected error occurred"
    );
    expect(scrubPublicErrorText("Invalid JSON body")).toBe("Invalid JSON body");
  });
});
