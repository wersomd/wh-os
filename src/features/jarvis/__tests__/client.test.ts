import { describe, it, expect, beforeEach } from "vitest";
import { isJarvisConfigured } from "../client";

describe("isJarvisConfigured", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  it("false when key missing", () => {
    expect(isJarvisConfigured()).toBe(false);
  });
  it("true when key present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(isJarvisConfigured()).toBe(true);
  });
});
