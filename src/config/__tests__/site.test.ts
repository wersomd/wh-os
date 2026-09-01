import { describe, it, expect } from "vitest";
import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("is branded WH·OS", () => {
    expect(siteConfig.name).toBe("WH·OS");
    expect(siteConfig.description).toMatch(/операционная система/i);
  });
});
