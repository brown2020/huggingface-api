import { describe, expect, it } from "vitest";
import { LLAVA_WAIT } from "./replicate";

describe("LLaVA wait mode", () => {
  it("polls until the prediction finishes", () => {
    expect(LLAVA_WAIT).toEqual({ mode: "poll", interval: 1000 });
  });
});
