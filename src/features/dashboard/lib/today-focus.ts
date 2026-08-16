import { isSameDay } from "date-fns";

export type FocusTask = { id: string; title: string; dueDate: Date | null; completedAt: Date | null };
export type FocusItem = { kind: "task"; id: string; title: string; href: string };

export function buildTodayFocus(input: { tasks: FocusTask[]; now: Date }): FocusItem[] {
  const { tasks, now } = input;

  return tasks
    .filter((t) => !t.completedAt && t.dueDate != null && isSameDay(t.dueDate, now))
    .map((t) => ({ kind: "task" as const, id: t.id, title: t.title, href: "/tasks" }));
}
