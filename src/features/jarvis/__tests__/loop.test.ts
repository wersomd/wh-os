import { describe, it, expect, vi } from "vitest";

const ok = async () => ({ ok: true as const });
vi.mock("@/features/tasks/actions", () => ({ createTask: ok, toggleDone: ok }));
vi.mock("@/features/finances/actions", () => ({ createTransaction: ok }));
vi.mock("@/features/debts/actions", () => ({ addPayment: ok }));
vi.mock("@/features/subscriptions/actions", () => ({
  createSubscription: ok,
  setSubscriptionActive: ok,
}));

const { classifyToolUse } = await import("../tools/registry");

describe("classifyToolUse", () => {
  it("read tool → execute", () => {
    expect(classifyToolUse("list_tasks")).toEqual({ kind: "read" });
  });
  it("write tool → confirm", () => {
    expect(classifyToolUse("create_task")).toEqual({ kind: "write" });
  });
  it("unknown → error", () => {
    expect(classifyToolUse("bogus")).toEqual({ kind: "error" });
  });
});
