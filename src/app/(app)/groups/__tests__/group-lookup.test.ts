import { describe, it, expect } from "vitest";
import { findGroupById } from "../group-lookup";

describe("findGroupById", () => {
  it("finds a known group", () => {
    expect(findGroupById("work")?.title).toBe("Работа");
    expect(findGroupById("money")?.title).toBe("Деньги");
    expect(findGroupById("personal")?.title).toBe("Личное");
  });

  it("returns undefined for an unknown id", () => {
    expect(findGroupById("nope")).toBeUndefined();
    expect(findGroupById("")).toBeUndefined();
  });
});
