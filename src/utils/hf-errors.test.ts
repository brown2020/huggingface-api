import { describe, expect, it } from "vitest";
import { HttpError } from "./http-error";
import {
  HF_AUTH_MESSAGE,
  HF_CREDITS_MESSAGE,
  HF_RATE_MESSAGE,
  HF_TIMEOUT_MESSAGE,
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
    expect(HF_CREDITS_MESSAGE).toBe(
      "The Hugging Face demo is out of credits right now."
    );
  });

  it("treats an exceeded-quota body as a credit failure", () => {
    const failure = classifyUpstreamFailure(
      providerError(400, "You have exceeded quota for inference")
    );
    expect(failure?.kind).toBe("credits");
    expect(failure?.message).toBe(HF_CREDITS_MESSAGE);
    expect(JSON.stringify(failure)).not.toContain(PLANTED_TOKEN);
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

  it("maps 401 to a fixture fallback and leaves a plain 403 as an error", () => {
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
      fallbackToFixtures: false,
    });
    expect(JSON.stringify(unauthorized)).not.toContain(PLANTED_TOKEN);
    expect(JSON.stringify(forbidden)).not.toContain("Bearer");
  });

  it("maps 429 to a fixture fallback", () => {
    const failure = classifyUpstreamFailure(providerError(429, "slow down"));
    expect(failure).toEqual({
      kind: "rate",
      status: 429,
      message: HF_RATE_MESSAGE,
      fallbackToFixtures: true,
    });
  });

  it("maps HTTP 503 to a fixture fallback and leaves other 5xx as errors", () => {
    expect(classifyUpstreamFailure(providerError(503, "down"))).toEqual({
      kind: "unavailable",
      status: 503,
      message: HF_UNAVAILABLE_MESSAGE,
      fallbackToFixtures: true,
    });
    for (const status of [500, 502]) {
      const failure = classifyUpstreamFailure(providerError(status, "boom"));
      expect(failure?.kind).toBe("unavailable");
      expect(failure?.status).toBe(503);
      expect(failure?.fallbackToFixtures).toBe(false);
    }
  });

  it("maps abort and timeout errors to 504", () => {
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    expect(classifyUpstreamFailure(abort)).toMatchObject({
      kind: "timeout",
      status: 504,
      message: HF_TIMEOUT_MESSAGE,
      fallbackToFixtures: true,
    });

    const timedOut = new Error("connect timed out");
    expect(classifyUpstreamFailure(timedOut)?.kind).toBe("timeout");

    expect(classifyUpstreamFailure(providerError(408, "request timeout"))?.status).toBe(
      504
    );

    const wrapped = new Error("fetch failed");
    (wrapped as Error & { cause?: unknown }).cause = Object.assign(
      new Error("connect timeout"),
      { code: "UND_ERR_CONNECT_TIMEOUT" }
    );
    expect(classifyUpstreamFailure(wrapped)?.status).toBe(504);
    expect(JSON.stringify(classifyUpstreamFailure(wrapped))).not.toContain("fetch failed");
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
