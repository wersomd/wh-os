import { describe, it, expect } from "vitest";
import { allNavItems, navGroups } from "@/config/nav";

describe("allNavItems", () => {
  it("flattens every group's items with their group title attached", () => {
    const items = allNavItems();
    const expectedCount = navGroups.reduce((sum, g) => sum + g.items.length, 0);
    expect(items).toHaveLength(expectedCount);

    const tasks = items.find((i) => i.href === "/tasks");
    expect(tasks?.groupTitle).toBe("Работа");
    const finances = items.find((i) => i.href === "/finances");
    expect(finances?.groupTitle).toBe("Деньги");
  });
});
