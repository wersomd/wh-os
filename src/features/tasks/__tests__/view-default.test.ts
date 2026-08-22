import { describe, expect, it } from "vitest";
import { DEFAULT_TASK_VIEW } from "../constants";

describe("DEFAULT_TASK_VIEW", () => {
  it("opens the task workspace in list mode", () => {
    expect(DEFAULT_TASK_VIEW).toBe("list");
  });
});
