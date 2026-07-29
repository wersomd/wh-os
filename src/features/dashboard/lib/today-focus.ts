import { isSameDay } from "date-fns";

export type FocusTask = { id: string; title: string; dueDate: Date | null; completedAt: Date | null };
export type FocusHabit = { id: string; name: string };
export type FocusItem = { kind: "task" | "habit"; id: string; title: string; href: string };

export function buildTodayFocus(input: {
  tasks: FocusTask[];
  habits: FocusHabit[];
  doneHabitIds: string[];
  now: Date;
}): FocusItem[] {
  const { tasks, habits, doneHabitIds, now } = input;
  const done = new Set(doneHabitIds);

  const taskItems: FocusItem[] = tasks
    .filter((t) => !t.completedAt && t.dueDate != null && isSameDay(t.dueDate, now))
    .map((t) => ({ kind: "task" as const, id: t.id, title: t.title, href: "/tasks" }));

  const habitItems: FocusItem[] = habits
    .filter((h) => !done.has(h.id))
    .map((h) => ({ kind: "habit" as const, id: h.id, title: h.name, href: "/habits" }));

  return [...taskItems, ...habitItems];
}
