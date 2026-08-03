"use client";

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CALENDAR_ITEM_DOT } from "../constants";
import type { CalendarItem } from "../queries";

const MAX_DOTS = 3;

export function CalendarDayCell({
  day,
  inMonth,
  today,
  items,
  onClick,
}: {
  day: Date;
  inMonth: boolean;
  today: boolean;
  items: CalendarItem[];
  onClick: () => void;
}) {
  const visible = items.slice(0, MAX_DOTS);
  const overflow = items.length - visible.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-20 flex-col items-start gap-1 bg-card p-2 text-left transition-colors hover:bg-accent/50",
        !inMonth && "bg-card/40 text-muted-foreground/50",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
          today && "bg-primary font-medium text-primary-foreground",
        )}
      >
        {format(day, "d")}
      </span>
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {visible.map((item) => (
            <span
              key={item.id}
              className={cn("size-1.5 rounded-full", CALENDAR_ITEM_DOT[item.kind])}
              title={item.title}
            />
          ))}
          {overflow > 0 && (
            <span className="text-[10px] text-muted-foreground">+{overflow}</span>
          )}
        </div>
      )}
    </button>
  );
}
