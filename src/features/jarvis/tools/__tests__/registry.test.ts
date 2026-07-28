import { describe, it, expect, vi } from "vitest";

// The write tools statically import server actions, which pull in next-auth and
// cannot load under Vitest's node runtime. Mock them — the registry test only
// inspects tool metadata (names, schemas, kinds), never executes an action.
const ok = async () => ({ ok: true as const });
vi.mock("@/features/tasks/actions", () => ({ createTask: ok, toggleDone: ok }));
vi.mock("@/features/finances/actions", () => ({ createTransaction: ok }));
vi.mock("@/features/debts/actions", () => ({ addPayment: ok }));
vi.mock("@/features/subscriptions/actions", () => ({
  createSubscription: ok,
  setSubscriptionActive: ok,
}));

const { toolDefinitions, getTool } = await import("../registry");

describe("registry", () => {
  it("exposes every tool with an object input_schema", () => {
    expect(toolDefinitions.length).toBeGreaterThanOrEqual(11);
    for (const def of toolDefinitions) {
      expect(def.input_schema.type).toBe("object");
    }
  });
  it("tags read vs write", () => {
    expect(getTool("list_tasks")?.kind).toBe("read");
    expect(getTool("create_task")?.kind).toBe("write");
  });
  it("returns undefined for unknown tool", () => {
    expect(getTool("nope")).toBeUndefined();
  });
});
