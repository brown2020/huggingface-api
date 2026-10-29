import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEMO_PASSWORD_MESSAGE } from "@/utils/demo-password";
import HuggingFace from "./HuggingFace";
import { DemoDataBadge } from "./demo-mode-banner";

describe("demo password field", () => {
  it("labels the unlock field and explains it", () => {
    const html = renderToStaticMarkup(createElement(HuggingFace));
    expect(html).toContain("Demo password");
    expect(html).toContain(DEMO_PASSWORD_MESSAGE);
    expect(html).toContain("HF_API_SECRET");
    expect(html).not.toContain("API key");
  });
});

describe("DemoDataBadge", () => {
  it("renders a small Demo data badge", () => {
    const html = renderToStaticMarkup(createElement(DemoDataBadge));
    expect(html).toContain("Demo data");
    expect(html).toContain("text-xs");
  });
});
