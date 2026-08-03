import { z } from "zod";

export const calendarEventCreateSchema = z.object({
  title: z.string().trim().min(1, "Введите название").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата"),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Некорректное время")
    .default("09:00"),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const calendarEventUpdateSchema = calendarEventCreateSchema.extend({
  id: z.string().min(1),
});

export type CalendarEventCreateInput = z.input<typeof calendarEventCreateSchema>;
export type CalendarEventUpdateInput = z.input<typeof calendarEventUpdateSchema>;
