import { describe, it, expect } from "vitest";
import { buildTodayFocus } from "@/features/dashboard/lib/today-focus";

const now = new Date("2026-07-29T09:00:00");

describe("buildTodayFocus", () => {
  it("includes tasks due today that are not completed", () => {
    const items = buildTodayFocus({
      tasks: [{ id: "t1", title: "Отчёт", dueDate: new Date("2026-07-29T14:00:00"), completedAt: null }],
      now,
    });
    expect(items).toEqual([{ kind: "task", id: "t1", title: "Отчёт", href: "/tasks" }]);
  });

  it("excludes completed tasks and tasks due other days", () => {
    const items = buildTodayFocus({
      tasks: [
        { id: "t1", title: "Done", dueDate: now, completedAt: now },
        { id: "t2", title: "Tomorrow", dueDate: new Date("2026-07-30T09:00:00"), completedAt: null },
      ],
      now,
    });
    expect(items).toEqual([]);
  });
});
