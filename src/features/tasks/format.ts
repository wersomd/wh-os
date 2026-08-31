import {
  differenceInCalendarDays,
  isToday,
  isTomorrow,
  isYesterday,
  isThisYear,
  format,
} from "date-fns";
import { ru } from "date-fns/locale";
import { TaskStatus } from "@prisma/client";

// Statuses where a passed due date still means "you're late". REVIEW = work is
// done and waiting on a check; ON_HOLD = deliberately parked — for neither does a
// red "overdue" badge carry a useful signal, so they never render as overdue.
const ACTIONABLE_STATUSES: ReadonlySet<TaskStatus> = new Set([
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
]);

export type DueInfo = {
  label: string;
  // Past its due date AND still in an actionable status.
  overdue: boolean;
  // Whole calendar days past due; 0 when not overdue.
  overdueDays: number;
};

// Human due-date label + whether it should read as overdue for this task.
// Pass the task status so REVIEW / ON_HOLD are never flagged red.
export function formatDue(date: Date, status?: TaskStatus): DueInfo {
  const now = new Date();
  const daysPast = differenceInCalendarDays(startOfDay(now), startOfDay(date));
  const pastDue = daysPast > 0;
  const actionable = status === undefined || ACTIONABLE_STATUSES.has(status);
  const overdue = pastDue && actionable;

  let label: string;
  if (isToday(date)) label = "Сегодня";
  else if (isTomorrow(date)) label = "Завтра";
  else if (isYesterday(date)) label = "Вчера";
  else if (isThisYear(date)) label = format(date, "d MMM", { locale: ru });
  else label = format(date, "d MMM yyyy", { locale: ru });

  return { label, overdue, overdueDays: overdue ? daysPast : 0 };
}

// "просрочено на 3 дн." — short overdue suffix for badges.
export function overdueLabel(days: number): string {
  return `просрочено на ${days} дн.`;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
