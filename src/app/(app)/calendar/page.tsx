import type { Metadata } from "next";
import { endOfDay, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { CalendarMonthGrid } from "@/features/calendar/components/calendar-month-grid";
import { getCalendarItems } from "@/features/calendar/queries";

export const metadata: Metadata = { title: "Календарь" };

function parseMonth(param?: string): Date {
  if (param && /^\d{4}-\d{2}$/.test(param)) {
    const [year, month] = param.split("-").map(Number);
    return new Date(year, month - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = parseMonth(monthParam);
  const from = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const to = endOfDay(endOfWeek(endOfMonth(month), { weekStartsOn: 1 }));
  const items = await getCalendarItems({ from, to });

  return <CalendarMonthGrid month={month} items={items} />;
}
