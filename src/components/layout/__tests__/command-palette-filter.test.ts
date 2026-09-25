import { describe, it, expect } from "vitest";
import { CheckSquare, Wallet } from "lucide-react";
import { filterNavItems } from "../command-palette-filter";
import type { SearchableNavItem } from "@/config/nav";

const items: SearchableNavItem[] = [
  { title: "Задачи", href: "/tasks", icon: CheckSquare, groupTitle: "Работа" },
  { title: "Финансы", href: "/finances", icon: Wallet, groupTitle: "Деньги" },
];

describe("filterNavItems", () => {
  it("returns everything for an empty query", () => {
    expect(filterNavItems(items, "")).toEqual(items);
  });

  it("returns everything for a whitespace-only query", () => {
    expect(filterNavItems(items, "   ")).toEqual(items);
  });

  it("matches by item title, case-insensitively", () => {
    expect(filterNavItems(items, "ЗАдач")).toEqual([items[0]]);
  });

  it("matches by group title", () => {
    expect(filterNavItems(items, "деньги")).toEqual([items[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterNavItems(items, "xyz")).toEqual([]);
  });
});
