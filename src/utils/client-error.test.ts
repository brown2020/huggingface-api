import { describe, expect, it } from "vitest";
import {
  demoPresentationFromHeaders,
  demoPresentationFromPayload,
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

describe("demo presentation", () => {
  it("reads the demo-data badge and the credit notice", () => {
    expect(
      demoPresentationFromPayload({
        demoData: true,
        notice: HF_CREDITS_MESSAGE,
        message: "[fixture]",
      })
    ).toEqual({ demoData: true, notice: HF_CREDITS_MESSAGE });
  });

  it("shows the badge for fixture mode without a credit notice", () => {
    expect(demoPresentationFromPayload({ fixture: true, demoData: true, message: "[fixture]" })).toEqual({
      demoData: true,
      notice: null,
    });
  });

  it("rejects an unsafe notice and reads image headers", () => {
    expect(
      demoPresentationFromPayload({ demoData: true, notice: PLANTED_TOKEN })
    ).toEqual({ demoData: true, notice: null });
    const headers = new Headers({
      "X-HF-Demo-Data": "true",
      "X-HF-Notice": HF_CREDITS_MESSAGE,
    });
    expect(demoPresentationFromHeaders(headers)).toEqual({
      demoData: true,
      notice: HF_CREDITS_MESSAGE,
    });
    expect(
      demoPresentationFromHeaders(
        new Headers({
          "X-HF-Demo-Data": "true",
          "X-HF-Notice": `Bearer ${PLANTED_TOKEN}`,
        })
      )
    ).toEqual({ demoData: true, notice: null });
  });
});
