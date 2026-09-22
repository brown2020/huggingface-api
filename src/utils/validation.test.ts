import { describe, expect, it } from "vitest";
import {
  chatSchema,
  textToImageSchema,
  translationSchema,
  typeSchema,
} from "./validation";

describe("typeSchema", () => {
  it("accepts known task types", () => {
    expect(typeSchema.parse("comp")).toBe("comp");
    expect(typeSchema.parse("ttpng")).toBe("ttpng");
  });

  it("rejects unknown type (denied mutation / validation)", () => {
    expect(typeSchema.safeParse("hack").success).toBe(false);
    expect(typeSchema.safeParse(null).success).toBe(false);
  });
});

describe("chatSchema", () => {
  it("requires a non-empty message", () => {
    expect(chatSchema.safeParse({ message: "" }).success).toBe(false);
    expect(chatSchema.parse({ message: "hi" }).message).toBe("hi");
  });
});

describe("translationSchema", () => {
  it("requires text", () => {
    expect(translationSchema.safeParse({ text: "" }).success).toBe(false);
    expect(translationSchema.parse({ text: "hello" }).text).toBe("hello");
  });
});

describe("textToImageSchema", () => {
  it("requires prompt length >= 3", () => {
    expect(textToImageSchema.safeParse({ prompt: "ab" }).success).toBe(false);
    expect(textToImageSchema.parse({ prompt: "cat" }).prompt).toBe("cat");
  });
});
