import { z } from "zod";
import { ProjectStatus } from "@prisma/client";

const hexColor = z
  .string()
  .regex(/^#([0-9a-fA-F]{6})$/, "Цвет должен быть в формате #RRGGBB");

// Native <input type="date"> emits "YYYY-MM-DD"; empty string means "no date".
// Mirrors the dueDate pattern in src/features/tasks/schema.ts.
const deadline = z
  .string()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? new Date(`${v}T00:00:00`) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), {
    message: "Некорректная дата",
  });

export const projectCreateSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(120),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANNING),
  deadline,
  color: hexColor.optional().or(z.literal("")),
});

export const projectUpdateSchema = projectCreateSchema.extend({
  id: z.string().min(1),
});

export type ProjectCreateInput = z.input<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.input<typeof projectUpdateSchema>;
