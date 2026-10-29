import { describe, expect, it } from "vitest";
import {
  demoReasonFromHeaders,
  demoReasonFromPayload,
  formatClientError,
} from "./client-error";
import { HF_CREDITS_MESSAGE, HF_RATE_MESSAGE } from "./hf-errors";

const PLANTED_TOKEN = "hf_TESTTOKENSHOULDNOTLEAK";

describe("formatClientError", () => {
  it("shows a JSON error string from the API", () => {
    expect(
      formatClientError("Too Many Requests", JSON.stringify({ error: HF_RATE_MESSAGE }))
    ).toBe(HF_RATE_MESSAGE);
  });

  it("drops raw bodies and planted tokens", () => {
    const raw = formatClientError(
      "Internal Server Error",
      `You have no remaining credits ${PLANTED_TOKEN}`
    );
    expect(raw).toBe("Internal Server Error");
    expect(raw).not.toContain(PLANTED_TOKEN);
    expect(
      formatClientError("", `You have no remaining credits ${PLANTED_TOKEN}`)
    ).toBe("Request failed");
    expect(
      formatClientError(
        "Bad Gateway",
        JSON.stringify({ error: `Bearer ${PLANTED_TOKEN}` })
      )
    ).toBe("Request failed");
    expect(
      formatClientError("", JSON.stringify({ message: "provider exploded" }))
    ).toBe("Request failed");
  });
});

describe("demo reason parsing", () => {
  it("reads a safe demo reason from JSON", () => {
    expect(
      demoReasonFromPayload({
        demoMode: true,
        demoReason: HF_CREDITS_MESSAGE,
        message: "[fixture]",
      })
    ).toBe(HF_CREDITS_MESSAGE);
  });

  it("ignores fixture payloads that are not a fallback", () => {
    expect(demoReasonFromPayload({ fixture: true, message: "[fixture]" })).toBeNull();
  });

  it("rejects an unsafe demo reason and reads image headers", () => {
    expect(
      demoReasonFromPayload({ demoMode: true, demoReason: PLANTED_TOKEN })
    ).toBeNull();
    const headers = new Headers({
      "X-HF-Demo-Mode": "true",
      "X-HF-Demo-Reason": HF_CREDITS_MESSAGE,
    });
    expect(demoReasonFromHeaders(headers)).toBe(HF_CREDITS_MESSAGE);
    expect(
      demoReasonFromHeaders(
        new Headers({
          "X-HF-Demo-Mode": "true",
          "X-HF-Demo-Reason": `Bearer ${PLANTED_TOKEN}`,
        })
      )
    ).toBeNull();
  });
});
