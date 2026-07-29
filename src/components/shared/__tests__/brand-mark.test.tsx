import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import BrandMark from "@/components/shared/brand-mark";

describe("BrandMark", () => {
  it("renders the 人生 logomark", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain("人生");
  });
  it("shows the wordmark when asked", () => {
    const html = renderToStaticMarkup(<BrandMark withWordmark />);
    expect(html).toContain("JinseiOS");
  });
});
