import { describe, expect, it } from "vitest";
import { FINANCE_CATEGORY_PRESETS } from "../constants";

describe("FINANCE_CATEGORY_PRESETS", () => {
  it("contains the Kaspi-familiar core expense categories exactly once", () => {
    const expenseNames = FINANCE_CATEGORY_PRESETS
      .filter((category) => category.type === "EXPENSE")
      .map((category) => category.name);

    expect(expenseNames).toEqual(
      expect.arrayContaining([
        "Продукты",
        "Кафе и рестораны",
        "Одежда и обувь",
      ]),
    );
    expect(new Set(expenseNames).size).toBe(expenseNames.length);
  });
});
