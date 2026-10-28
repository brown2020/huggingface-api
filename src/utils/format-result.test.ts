import { describe, expect, it } from "vitest";
import { formatResultMessage } from "./format-result";

describe("formatResultMessage", () => {
  it("does not wrap string output in extra quotes", () => {
    expect(formatResultMessage("Bonjour")).toBe("Bonjour");
    expect(formatResultMessage(null)).toBe("");
    expect(formatResultMessage(["a", "b"])).toBe('[\n  "a",\n  "b"\n]');
  });
});