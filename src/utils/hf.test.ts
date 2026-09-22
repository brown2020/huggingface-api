import { describe, expect, it } from "vitest";
import { getBestProvider } from "./hf";
import {
  FIXTURE_COMPLETION,
  fixturePngBuffer,
  hfFixturesEnabled,
} from "./hf-fixtures";

describe("getBestProvider (fixture-safe — no live HF)", () => {
  it("maps deepseek chat to fireworks-ai", () => {
    expect(getBestProvider("deepseek-ai/deepseek-v3-0324", "chatCompletion")).toBe(
      "fireworks-ai"
    );
  });

  it("defaults unknown image models to replicate", () => {
    expect(getBestProvider("unknown/img-model", "textToImage")).toBe("replicate");
  });

  it("defaults unknown chat models to fireworks-ai", () => {
    expect(getBestProvider("unknown/llm", "chatCompletion")).toBe("fireworks-ai");
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
});
