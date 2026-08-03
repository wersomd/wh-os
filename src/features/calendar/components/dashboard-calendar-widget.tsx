import Link from "next/link";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { CALENDAR_ITEM_DOT } from "../constants";
import type { CalendarItem } from "../queries";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MAX_DOTS = 3;

export function DashboardCalendarWidget({
  month,
  items,
}: {
  month: Date;
  items: CalendarItem[];
}) {
  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <CalendarRange className="size-3.5" />
          </span>
          <span className="capitalize">{format(month, "LLLL yyyy", { locale: ru })}</span>
        </h2>
        <Link href="/calendar" className="text-xs text-primary hover:underline">
          Открыть
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[10px] text-muted-foreground">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const dayItems = items.filter((item) => isSameDay(item.date, day));
          const visible = dayItems.slice(0, MAX_DOTS);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md py-1.5",
                !isSameMonth(day, month) && "opacity-30",
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                  isToday(day) && "bg-primary font-medium text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex h-1.5 items-center gap-0.5">
                {visible.map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      "rounded-full",
                      item.kind === "debt" ? "size-1.5" : "size-1",
                      CALENDAR_ITEM_DOT[item.kind],
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
