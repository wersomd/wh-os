import {
  CalendarPlus,
  CheckSquare,
  CreditCard,
  HandCoins,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { CalendarKind } from "./queries";

export const CALENDAR_ITEM_ICON: Record<CalendarKind, LucideIcon> = {
  task: CheckSquare,
  goal: Target,
  debt: HandCoins,
  subscription: CreditCard,
  event: CalendarPlus,
};

export const CALENDAR_ITEM_LABEL: Record<CalendarKind, string> = {
  task: "Задача",
  goal: "Цель",
  debt: "Долг",
  subscription: "Подписка",
  event: "Событие",
};

// Dot color per kind, used by the dashboard mini-grid where there's no
// room for item text.
export const CALENDAR_ITEM_DOT: Record<CalendarKind, string> = {
  task: "bg-blue-500",
  goal: "bg-fuchsia-500",
  debt: "bg-rose-500",
  subscription: "bg-sky-500",
  event: "bg-emerald-500",
};

// Text-chip style per kind, used by the full month-grid day cells (title
// text, not just a dot). Debts are bolded and get a stronger background —
// due-debt reminders are the highest-stakes item on the calendar.
export const CALENDAR_ITEM_CHIP: Record<CalendarKind, string> = {
  task: "bg-blue-500/15 text-blue-400",
  goal: "bg-fuchsia-500/15 text-fuchsia-400",
  debt: "bg-rose-500/25 text-rose-300 font-semibold",
  subscription: "bg-sky-500/15 text-sky-400",
  event: "bg-emerald-500/15 text-emerald-400",
};
