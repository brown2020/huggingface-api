import { describe, expect, it, vi } from "vitest";
import { HttpError } from "./http-error";
import { getBestProvider, canonicalizeModelId, withHfErrors } from "./hf";
import { HF_CREDITS_MESSAGE, HF_TIMEOUT_MESSAGE } from "./hf-errors";
import {
  FIXTURE_COMPLETION,
  fixturePngBuffer,
  hfFixturesEnabled,
  savedFixturesExist,
} from "./hf-fixtures";
import { DEFAULT_CHAT_MODEL, DEFAULT_IMAGE_MODEL } from "./models";

describe("getBestProvider (fixture-safe — no live HF)", () => {
  it("canonicalizes legacy lowercase deepseek id", () => {
    expect(canonicalizeModelId("deepseek-ai/deepseek-v3-0324")).toBe(
      DEFAULT_CHAT_MODEL
    );
  });

  it("maps DeepSeek V3 chat to auto (live provider routing)", () => {
    expect(getBestProvider(DEFAULT_CHAT_MODEL, "chatCompletion")).toBe("auto");
    expect(
      getBestProvider("deepseek-ai/deepseek-v3-0324", "chatCompletion")
    ).toBe("auto");
  });

  it("routes DeepSeek R1 through the catalog auto provider", () => {
    expect(getBestProvider("deepseek-ai/DeepSeek-R1", "chatCompletion")).toBe(
      "auto"
    );
  });

  it("maps SDXL text-to-image to fal-ai", () => {
    expect(
      getBestProvider(
        "stabilityai/stable-diffusion-xl-base-1.0",
        "textToImage"
      )
    ).toBe("fal-ai");
  });

  it("defaults unknown image models to auto", () => {
    expect(getBestProvider("unknown/img-model", "textToImage")).toBe("auto");
  });

  it("defaults unknown chat models to auto", () => {
    expect(getBestProvider("unknown/llm", "chatCompletion")).toBe("auto");
  });

  it("exposes FLUX default image model", () => {
    expect(DEFAULT_IMAGE_MODEL).toBe("black-forest-labs/FLUX.1-dev");
    expect(getBestProvider(DEFAULT_IMAGE_MODEL, "textToImage")).toBe("auto");
  });
});

describe("hf fixtures (labeled — no paid credit burn)", () => {
  it("exposes completion fixture text", () => {
    expect(FIXTURE_COMPLETION).toContain("[fixture]");
  });

  it("builds a valid PNG buffer", () => {
    const buf = fixturePngBuffer();
    expect(buf[0]).toBe(0x89);
    expect(buf.length).toBeGreaterThan(10);
  });

  it("reads HF_USE_FIXTURES flag", () => {
    const prev = process.env.HF_USE_FIXTURES;
    process.env.HF_USE_FIXTURES = "true";
    expect(hfFixturesEnabled()).toBe(true);
    process.env.HF_USE_FIXTURES = "false";
    expect(hfFixturesEnabled()).toBe(false);
    if (prev === undefined) delete process.env.HF_USE_FIXTURES;
    else process.env.HF_USE_FIXTURES = prev;
  });

  it("ships saved samples for the credit fallback", () => {
    expect(savedFixturesExist()).toBe(true);
  });
});

describe("withHfErrors", () => {
  it("maps a credit failure to a safe 402 and does not log the token", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = "hf_TESTTOKENSHOULDNOTLEAK";
    const error = Object.assign(new Error(`no credits ${token}`), {
      httpResponse: {
        status: 402,
        body: { error: "You have no remaining credits", token },
      },
      httpRequest: { headers: { Authorization: `Bearer ${token}` } },
    });
    await expect(withHfErrors(() => Promise.reject(error))).rejects.toMatchObject({
      status: 402,
      message: HF_CREDITS_MESSAGE,
    });
    expect(logged.mock.calls.flat().join(" ")).not.toContain(token);
    logged.mockRestore();
  });

  it("maps a timeout to 504", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    await expect(withHfErrors(() => Promise.reject(timeout))).rejects.toEqual(
      expect.any(HttpError)
    );
    await expect(withHfErrors(() => Promise.reject(timeout))).rejects.toMatchObject({
      status: 504,
      message: HF_TIMEOUT_MESSAGE,
    });
  });
});
