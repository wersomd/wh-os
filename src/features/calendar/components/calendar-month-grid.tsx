"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDayCell } from "./calendar-day-cell";
import { CalendarDayDialog } from "./calendar-day-dialog";
import type { CalendarItem } from "../queries";

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarMonthGrid({
  month,
  items,
}: {
  month: Date;
  items: CalendarItem[];
}) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  function itemsForDay(day: Date) {
    return items.filter((item) => isSameDay(item.date, day));
  }

  function goToMonth(next: Date) {
    router.push(`/calendar?month=${format(next, "yyyy-MM")}`);
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold capitalize tracking-tight">
          {format(month, "LLLL yyyy", { locale: ru })}
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => goToMonth(subMonths(month, 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => goToMonth(new Date())}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goToMonth(addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border text-xs text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-card px-2 py-2 text-center font-medium">
            {d}
          </div>
        ))}
        {days.map((day) => (
          <CalendarDayCell
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, month)}
            today={isToday(day)}
            items={itemsForDay(day)}
            onClick={() => setSelectedDate(day)}
          />
        ))}
      </div>

      <CalendarDayDialog
        date={selectedDate}
        items={selectedDate ? itemsForDay(selectedDate) : []}
        onOpenChange={(open) => !open && setSelectedDate(null)}
      />
    </>
  );
}
