import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoModeBanner } from "./demo-mode-banner";
import { HF_CREDITS_MESSAGE } from "@/utils/hf-errors";

describe("DemoModeBanner", () => {
  it("renders the sample-results banner and the reason", () => {
    const html = renderToStaticMarkup(
      createElement(DemoModeBanner, { reason: HF_CREDITS_MESSAGE })
    );
    expect(html).toContain("Demo mode: sample results");
    expect(html).toContain("Hugging Face credits are used up");
    expect(html).toContain('role="status"');
  });
});
