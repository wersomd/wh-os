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

// Dot color per kind, used by the month-grid day cells.
export const CALENDAR_ITEM_DOT: Record<CalendarKind, string> = {
  task: "bg-violet-500",
  goal: "bg-fuchsia-500",
  debt: "bg-rose-500",
  subscription: "bg-sky-500",
  event: "bg-emerald-500",
};
