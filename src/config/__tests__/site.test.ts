import { describe, it, expect } from "vitest";
import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("is branded JinseiOS", () => {
    expect(siteConfig.name).toBe("JinseiOS");
    expect(siteConfig.description).toMatch(/операционная система/i);
  });
});
