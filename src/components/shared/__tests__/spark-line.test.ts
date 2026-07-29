import { describe, it, expect } from "vitest";
import { sparklinePoints } from "@/components/shared/spark-line";

describe("sparklinePoints", () => {
  it("returns empty string for no data", () => {
    expect(sparklinePoints([], 100, 20)).toBe("");
  });
  it("centres a single flat value", () => {
    expect(sparklinePoints([5], 100, 20)).toBe("0,10");
  });
  it("maps min to bottom and max to top", () => {
    const pts = sparklinePoints([0, 10], 10, 20).split(" ");
    expect(pts[0]).toBe("0,20"); // min → y=height
    expect(pts[1]).toBe("10,0"); // max → y=0
  });
});
