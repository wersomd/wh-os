import { describe, it, expect } from "vitest";
import { clampPercent } from "@/components/shared/progress-bar";

describe("clampPercent", () => {
  it("computes a percentage", () => {
    expect(clampPercent(50, 200)).toBe(25);
  });
  it("clamps above 100", () => {
    expect(clampPercent(300, 200)).toBe(100);
  });
  it("returns 0 when max is 0", () => {
    expect(clampPercent(50, 0)).toBe(0);
  });
});
