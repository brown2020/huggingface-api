import { describe, expect, it } from "vitest";
import { DEFAULT_CHAT_MODEL, DEFAULT_IMAGE_MODEL } from "./models";
import {
  chatSchema,
  MAX_COMPLETION_TOKENS,
  MAX_TEXT_CHARS,
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

  it("allowlists catalog chat models and caps completion size", () => {
    expect(chatSchema.safeParse({ message: "hi", model: DEFAULT_CHAT_MODEL }).success).toBe(
      true
    );
    expect(
      chatSchema.safeParse({ message: "hi", model: "org/not-in-catalog" }).success
    ).toBe(false);
    expect(
      chatSchema.safeParse({ message: "hi", model: DEFAULT_IMAGE_MODEL }).success
    ).toBe(false);
    expect(
      chatSchema.safeParse({ message: "hi", max_tokens: MAX_COMPLETION_TOKENS }).success
    ).toBe(true);
    expect(
      chatSchema.safeParse({ message: "hi", max_tokens: MAX_COMPLETION_TOKENS + 1 })
        .success
    ).toBe(false);
    expect(chatSchema.safeParse({ message: "x".repeat(MAX_TEXT_CHARS + 1) }).success).toBe(
      false
    );
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

  it("allowlists catalog image models only", () => {
    expect(
      textToImageSchema.safeParse({ prompt: "cat", model: DEFAULT_IMAGE_MODEL }).success
    ).toBe(true);
    expect(
      textToImageSchema.safeParse({ prompt: "cat", model: DEFAULT_CHAT_MODEL }).success
    ).toBe(false);
  });
});
