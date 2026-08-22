import { describe, expect, it } from "vitest";
import { validateCategoryType } from "../schema";

describe("validateCategoryType", () => {
  it("rejects an income category for an expense", () => {
    expect(validateCategoryType("EXPENSE", "INCOME")).toEqual({
      error: "Категория не соответствует типу операции",
    });
  });
});
