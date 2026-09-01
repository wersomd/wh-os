import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import BrandMark from "@/components/shared/brand-mark";

describe("BrandMark", () => {
  it("renders the node-graph logomark", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain("<svg");
    expect(html).toContain("var(--brand-node)");
  });
  it("shows the wordmark when asked", () => {
    const html = renderToStaticMarkup(<BrandMark withWordmark />);
    expect(html).toContain("WH·OS");
  });
});
