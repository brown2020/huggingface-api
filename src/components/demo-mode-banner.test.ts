import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DemoDataBadge } from "./demo-mode-banner";

describe("DemoDataBadge", () => {
  it("renders a small Demo data badge", () => {
    const html = renderToStaticMarkup(createElement(DemoDataBadge));
    expect(html).toContain("Demo data");
    expect(html).toContain("text-xs");
  });
});
