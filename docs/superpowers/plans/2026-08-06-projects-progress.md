# Projects: Stages, Deadlines, Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Projects module a 6-value stage field, a project deadline, a computed completion percentage, and an urgency-ranked view of all projects (on `/projects` and on the Dashboard) so the user can see what to finish next.

**Architecture:** Extend the existing `Project.status` enum in place (6 values instead of 4) and add `Project.deadline`. Progress/urgency logic lives in pure, unit-tested functions (`src/features/projects/progress.ts`), matching the existing `dashboard/lib/*.ts` pattern. Server Components fetch and rank; Client Components (dialog, inline stage select, filter chips) handle interactivity via existing Server Actions.

**Tech Stack:** Next.js 15 App Router, Prisma 6 / PostgreSQL, Zod, date-fns, Tailwind v4, shadcn/ui `Select`, Vitest.

## Global Constraints

- DB target for migrations: the `.env` currently configured Supabase instance (via `DIRECT_URL`, session pooler, no pgbouncer) — confirmed with the user, no local Docker DB needed for this work.
- Money/currency conventions are irrelevant here (no financial fields touched).
- Dark-first UI; reuse the existing electric-violet accent and the `chip`-style color classes already used on the Dashboard (`bg-<color>-500/15 text-<color>-400`).
- Russian-language UI copy throughout (matches the rest of the app).
- Pure lib functions must not import `@prisma/client` types — use string-literal unions, matching `src/features/dashboard/lib/finance-pulse.ts`'s existing convention (e.g. `direction: "I_OWE" | "OWED_TO_ME"`).
- Follow existing file conventions: `queries.ts` is `server-only` and read-only; `actions.ts` is `"use server"` and validates with the feature's `schema.ts`; dialogs are `"use client"`.

---

### Task 1: Prisma schema — expand `ProjectStatus`, add `deadline`

**Files:**
- Modify: `prisma/schema.prisma` (Project model + `ProjectStatus` enum, currently at line 46-63)
- Create: `prisma/migrations/<timestamp>_expand_project_status_add_deadline/migration.sql`

**Interfaces:**
- Produces: `ProjectStatus` enum with values `PLANNING | IN_PROGRESS | REVIEW | ON_HOLD | DONE | ARCHIVED` (default `PLANNING`); `Project.deadline: DateTime | null`.

- [ ] **Step 1: Edit the enum and add the column in `prisma/schema.prisma`**

Replace:

```prisma
enum ProjectStatus {
  ACTIVE
  ON_HOLD
  COMPLETED
  ARCHIVED
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(ACTIVE)
  color       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  tasks       Task[]
  notes       Note[]
}
```

with:

```prisma
enum ProjectStatus {
  PLANNING
  IN_PROGRESS
  REVIEW
  ON_HOLD
  DONE
  ARCHIVED
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(PLANNING)
  deadline    DateTime?
  color       String?
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  tasks       Task[]
  notes       Note[]
}
```

- [ ] **Step 2: Generate a draft migration without applying it**

Run: `pnpm prisma migrate dev --create-only --name expand_project_status_add_deadline`

This creates `prisma/migrations/<timestamp>_expand_project_status_add_deadline/migration.sql` with Prisma's best-effort diff. Postgres enums can't have values removed or renamed in place, so this draft is not safe to apply as-is — it will be replaced entirely in the next step.

- [ ] **Step 3: Replace the generated migration.sql with a hand-written, data-safe version**

Overwrite the full contents of the generated `migration.sql` with:

```sql
-- Add the new deadline column.
ALTER TABLE "Project" ADD COLUMN "deadline" TIMESTAMP(3);

-- Rename the old enum type out of the way.
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";

-- Create the new enum type with the expanded value set.
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'REVIEW', 'ON_HOLD', 'DONE', 'ARCHIVED');

-- Migrate the column to the new type, mapping old values to new ones.
ALTER TABLE "Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus" USING (
  CASE "status"::text
    WHEN 'ACTIVE' THEN 'IN_PROGRESS'
    WHEN 'ON_HOLD' THEN 'ON_HOLD'
    WHEN 'COMPLETED' THEN 'DONE'
    WHEN 'ARCHIVED' THEN 'ARCHIVED'
  END::"ProjectStatus"
);
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'PLANNING';

-- Drop the old enum type.
DROP TYPE "ProjectStatus_old";
```

- [ ] **Step 4: Apply the migration and regenerate the client**

Run: `pnpm prisma migrate dev`

Prisma detects the pending migration created in Step 2/3 and applies it, then regenerates the client automatically. If it doesn't regenerate, run `pnpm db:generate` explicitly.

- [ ] **Step 5: Verify the migration applied correctly**

Run: `pnpm prisma studio` and open the `Project` table, or run:

```bash
DATABASE_URL="$DIRECT_URL" node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.project.findMany({ select: { id: true, status: true, deadline: true } })
  .then((rows) => { console.log(rows); return db.\$disconnect(); });
"
```

Expected: every existing project's `status` is one of `PLANNING/IN_PROGRESS/REVIEW/ON_HOLD/DONE/ARCHIVED` (no project left with an old value like `ACTIVE`/`COMPLETED`), and `deadline` is `null` for all of them (column just added).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): expand ProjectStatus to 6 stages, add Project.deadline"
```

---

### Task 2: `progress.ts` — pure progress/urgency/deadline functions + tests

**Files:**
- Create: `src/features/projects/progress.ts`
- Create: `src/features/projects/__tests__/progress.test.ts`

**Interfaces:**
- Produces:
  - `computeProjectProgress(tasks: { status: TaskStatusLike }[]): ProjectProgress` where `ProjectProgress = { done: number; total: number; percent: number | null }`
  - `type TaskStatusLike = "TODO" | "IN_PROGRESS" | "REVIEW" | "ON_HOLD" | "DONE" | "CANCELLED"`
  - `type ProjectStatusLike = "PLANNING" | "IN_PROGRESS" | "REVIEW" | "ON_HOLD" | "DONE" | "ARCHIVED"`
  - `type DeadlineTone = "overdue" | "soon" | "normal" | "none"`
  - `describeDeadline(now: Date, deadline: Date | null): { tone: DeadlineTone; label: string }`
  - `interface RankableProject { id: string; status: ProjectStatusLike; deadline: Date | null; progress: { percent: number | null }; createdAt: Date }`
  - `rankProjectUrgency<T extends RankableProject>(now: Date, projects: T[]): T[]`

- [ ] **Step 1: Write the failing tests**

Create `src/features/projects/__tests__/progress.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  computeProjectProgress,
  describeDeadline,
  rankProjectUrgency,
  type RankableProject,
} from "@/features/projects/progress";

describe("computeProjectProgress", () => {
  it("computes done/total/percent, excluding cancelled tasks", () => {
    const result = computeProjectProgress([
      { status: "DONE" },
      { status: "DONE" },
      { status: "TODO" },
      { status: "CANCELLED" },
    ]);
    expect(result).toEqual({ done: 2, total: 3, percent: 67 });
  });

  it("returns percent: null when there are no countable tasks", () => {
    expect(computeProjectProgress([])).toEqual({ done: 0, total: 0, percent: null });
    expect(computeProjectProgress([{ status: "CANCELLED" }])).toEqual({
      done: 0,
      total: 0,
      percent: null,
    });
  });

  it("returns 100 percent when all countable tasks are done", () => {
    const result = computeProjectProgress([{ status: "DONE" }, { status: "DONE" }]);
    expect(result).toEqual({ done: 2, total: 2, percent: 100 });
  });
});

describe("describeDeadline", () => {
  const now = new Date("2026-08-06T09:00:00");

  it("returns tone 'none' when there is no deadline", () => {
    expect(describeDeadline(now, null)).toEqual({ tone: "none", label: "Без дедлайна" });
  });

  it("returns tone 'overdue' with days-late count for a past deadline", () => {
    const result = describeDeadline(now, new Date("2026-08-01T00:00:00"));
    expect(result).toEqual({ tone: "overdue", label: "Просрочен на 5 дн." });
  });

  it("returns tone 'soon' for today's deadline", () => {
    expect(describeDeadline(now, new Date("2026-08-06T23:00:00"))).toEqual({
      tone: "soon",
      label: "Сегодня дедлайн",
    });
  });

  it("returns tone 'soon' for a deadline within 3 days", () => {
    const result = describeDeadline(now, new Date("2026-08-08T00:00:00"));
    expect(result).toEqual({ tone: "soon", label: "Осталось 2 дн." });
  });

  it("returns tone 'normal' with a formatted date for a distant deadline", () => {
    const result = describeDeadline(now, new Date("2026-09-15T00:00:00"));
    expect(result).toEqual({ tone: "normal", label: "15 сент." });
  });
});

describe("rankProjectUrgency", () => {
  const now = new Date("2026-08-06T09:00:00");

  function project(overrides: Partial<RankableProject>): RankableProject {
    return {
      id: "id",
      status: "IN_PROGRESS",
      deadline: null,
      progress: { percent: null },
      createdAt: new Date("2026-01-01"),
      ...overrides,
    };
  }

  it("sorts overdue projects before ones with future deadlines", () => {
    const overdue = project({ id: "overdue", deadline: new Date("2026-08-01") });
    const future = project({ id: "future", deadline: new Date("2026-09-01") });
    expect(rankProjectUrgency(now, [future, overdue]).map((p) => p.id)).toEqual([
      "overdue",
      "future",
    ]);
  });

  it("sorts the most overdue project first among multiple overdue projects", () => {
    const a = project({ id: "a", deadline: new Date("2026-08-04") }); // 2 days overdue
    const b = project({ id: "b", deadline: new Date("2026-07-30") }); // 7 days overdue
    expect(rankProjectUrgency(now, [a, b]).map((p) => p.id)).toEqual(["b", "a"]);
  });

  it("puts projects without a deadline after ones with a deadline", () => {
    const withDeadline = project({ id: "with", deadline: new Date("2026-09-01") });
    const noDeadline = project({ id: "without", deadline: null });
    expect(rankProjectUrgency(now, [noDeadline, withDeadline]).map((p) => p.id)).toEqual([
      "with",
      "without",
    ]);
  });

  it("breaks ties on equal deadline urgency by higher progress first", () => {
    const lowProgress = project({
      id: "low",
      deadline: new Date("2026-09-01"),
      progress: { percent: 10 },
    });
    const highProgress = project({
      id: "high",
      deadline: new Date("2026-09-01"),
      progress: { percent: 90 },
    });
    expect(rankProjectUrgency(now, [lowProgress, highProgress]).map((p) => p.id)).toEqual([
      "high",
      "low",
    ]);
  });

  it("moves DONE and ARCHIVED projects to the end, after all active projects", () => {
    const done = project({ id: "done", status: "DONE", deadline: new Date("2026-08-01") });
    const archived = project({ id: "archived", status: "ARCHIVED" });
    const active = project({ id: "active", deadline: new Date("2026-12-01") });
    expect(rankProjectUrgency(now, [done, archived, active]).map((p) => p.id)).toEqual([
      "active",
      "done",
      "archived",
    ]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/features/projects/__tests__/progress.test.ts`
Expected: FAIL with "Cannot find module '@/features/projects/progress'" (or similar — the module doesn't exist yet).

- [ ] **Step 3: Implement `src/features/projects/progress.ts`**

```ts
import { differenceInCalendarDays, format } from "date-fns";
import { ru } from "date-fns/locale";

export type TaskStatusLike =
  | "TODO"
  | "IN_PROGRESS"
  | "REVIEW"
  | "ON_HOLD"
  | "DONE"
  | "CANCELLED";

export type ProjectStatusLike =
  | "PLANNING"
  | "IN_PROGRESS"
  | "REVIEW"
  | "ON_HOLD"
  | "DONE"
  | "ARCHIVED";

export interface ProjectProgress {
  done: number;
  total: number; // excludes cancelled tasks
  percent: number | null; // null when there are no countable tasks
}

export function computeProjectProgress(tasks: { status: TaskStatusLike }[]): ProjectProgress {
  const counted = tasks.filter((t) => t.status !== "CANCELLED");
  const done = counted.filter((t) => t.status === "DONE").length;
  const total = counted.length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : null };
}

export type DeadlineTone = "overdue" | "soon" | "normal" | "none";

export interface DeadlineInfo {
  tone: DeadlineTone;
  label: string;
}

// Deadline copy: overdue/soon buckets are actionable, distant deadlines just
// show a date. Days phrasing intentionally stays "N дн." (unpluralized),
// matching existing dashboard widgets (e.g. subscriptions' "N дн.").
export function describeDeadline(now: Date, deadline: Date | null): DeadlineInfo {
  if (!deadline) return { tone: "none", label: "Без дедлайна" };
  const days = differenceInCalendarDays(deadline, now);
  if (days < 0) return { tone: "overdue", label: `Просрочен на ${Math.abs(days)} дн.` };
  if (days === 0) return { tone: "soon", label: "Сегодня дедлайн" };
  if (days <= 3) return { tone: "soon", label: `Осталось ${days} дн.` };
  return { tone: "normal", label: format(deadline, "d MMM", { locale: ru }) };
}

const TERMINAL_STATUSES = new Set<ProjectStatusLike>(["DONE", "ARCHIVED"]);

export interface RankableProject {
  id: string;
  status: ProjectStatusLike;
  deadline: Date | null;
  progress: { percent: number | null };
  createdAt: Date;
}

function compareUrgency(a: RankableProject, b: RankableProject, now: Date): number {
  const aDays = a.deadline ? differenceInCalendarDays(a.deadline, now) : null;
  const bDays = b.deadline ? differenceInCalendarDays(b.deadline, now) : null;

  if (aDays !== null && bDays !== null && aDays !== bDays) return aDays - bDays;
  if (aDays !== null && bDays === null) return -1;
  if (aDays === null && bDays !== null) return 1;

  const aPct = a.progress.percent ?? -1;
  const bPct = b.progress.percent ?? -1;
  if (aPct !== bPct) return bPct - aPct;

  return b.createdAt.getTime() - a.createdAt.getTime();
}

// Ranks active projects by urgency (most overdue first, then soonest
// deadline, no-deadline last, ties broken by progress then recency).
// DONE/ARCHIVED projects are pushed to the end, in their original order.
export function rankProjectUrgency<T extends RankableProject>(now: Date, projects: T[]): T[] {
  const active: T[] = [];
  const terminal: T[] = [];
  for (const p of projects) {
    (TERMINAL_STATUSES.has(p.status) ? terminal : active).push(p);
  }
  active.sort((a, b) => compareUrgency(a, b, now));
  return [...active, ...terminal];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/features/projects/__tests__/progress.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/progress.ts src/features/projects/__tests__/progress.test.ts
git commit -m "feat(projects): add progress, deadline, and urgency ranking helpers"
```

---

### Task 3: Update `constants.ts` — labels, order, badge colors

**Files:**
- Modify: `src/features/projects/constants.ts`

**Interfaces:**
- Consumes: `DeadlineTone` from `./progress` (Task 2).
- Produces: `PROJECT_STATUS_LABELS: Record<ProjectStatus, string>`, `PROJECT_STATUS_ORDER: ProjectStatus[]`, `PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string>`, `DEADLINE_TONE_CLASS: Record<DeadlineTone, string>`.

- [ ] **Step 1: Replace the full contents of `src/features/projects/constants.ts`**

```ts
import { ProjectStatus } from "@prisma/client";
import type { DeadlineTone } from "./progress";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: "Планирование",
  IN_PROGRESS: "В работе",
  REVIEW: "Проверка",
  ON_HOLD: "На паузе",
  DONE: "Готово",
  ARCHIVED: "В архиве",
};

export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  ProjectStatus.PLANNING,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.REVIEW,
  ProjectStatus.ON_HOLD,
  ProjectStatus.DONE,
  ProjectStatus.ARCHIVED,
];

// Stage badge accent — same "chip" formula as the Dashboard's ACCENT map
// (bg-<color>-500/15 text-<color>-400), applied over Badge's `secondary`
// variant via tailwind-merge.
export const PROJECT_STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  PLANNING: "bg-slate-500/15 text-slate-400",
  IN_PROGRESS: "bg-violet-500/15 text-violet-400",
  REVIEW: "bg-amber-500/15 text-amber-400",
  ON_HOLD: "bg-sky-500/15 text-sky-400",
  DONE: "bg-emerald-500/15 text-emerald-400",
  ARCHIVED: "bg-neutral-500/15 text-neutral-400",
};

export const DEADLINE_TONE_CLASS: Record<DeadlineTone, string> = {
  overdue: "text-destructive",
  soon: "text-amber-500",
  normal: "text-muted-foreground",
  none: "text-muted-foreground/70",
};

// A small palette so projects get a consistent accent without a color wheel.
export const PROJECT_COLORS = [
  "#8b5cf6", // violet (default accent)
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a3a3a3", // neutral
];

export const DEFAULT_PROJECT_COLOR = PROJECT_COLORS[0];
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS for this file's own import (`./progress` already exists from Task 2). Remaining repo-wide errors, if any, belong to consumers not yet updated (Tasks 8-9) — not this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/constants.ts
git commit -m "feat(projects): add 6-stage labels, badge colors, deadline tone colors"
```

---

### Task 4: `queries.ts` — progress-aware `getProjects`, new `getHotProjects`

**Files:**
- Modify: `src/features/projects/queries.ts`

**Interfaces:**
- Consumes: `computeProjectProgress`, `rankProjectUrgency` from `./progress` (Task 2); `ProjectStatus` from `@prisma/client`.
- Produces:
  - `getProjects(): Promise<ProjectWithProgress[]>`
  - `type ProjectWithProgress = Awaited<ReturnType<typeof getProjects>>[number]` — has all `Project` scalar fields (including `deadline`) plus `taskCount: number` and `progress: ProjectProgress`.
  - `getHotProjects(limit?: number): Promise<ProjectWithProgress[]>`
  - `getProject(id: string)` — unchanged signature/behavior.

- [ ] **Step 1: Replace the full contents of `src/features/projects/queries.ts`**

```ts
import "server-only";
import { ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { computeProjectProgress, rankProjectUrgency } from "./progress";

// Projects for the list/dashboard views: each with a computed task-completion
// progress. Tasks are fetched status-only and discarded after computing
// progress — callers don't need the raw task list.
export async function getProjects() {
  const projects = await db.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { tasks: { select: { status: true } } },
  });
  return projects.map(({ tasks, ...project }) => ({
    ...project,
    taskCount: tasks.length,
    progress: computeProjectProgress(tasks),
  }));
}

export type ProjectWithProgress = Awaited<ReturnType<typeof getProjects>>[number];

// Top N non-terminal projects (excludes DONE/ARCHIVED), ranked by urgency —
// used by the /projects page's default view and the Dashboard widget.
export async function getHotProjects(limit = 4): Promise<ProjectWithProgress[]> {
  const projects = await getProjects();
  const active = projects.filter(
    (p) => p.status !== ProjectStatus.DONE && p.status !== ProjectStatus.ARCHIVED,
  );
  return rankProjectUrgency(new Date(), active).slice(0, limit);
}

// A single project for its detail page. Returns null when not found so the
// page can call notFound().
export async function getProject(id: string) {
  return db.project.findUnique({ where: { id } });
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL — `ProjectCard`, `ProjectList`, and other consumers still reference the old `ProjectWithCount` type and `_count.tasks`. This is expected; those are fixed in Tasks 8-9.

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/queries.ts
git commit -m "feat(projects): compute task progress in getProjects, add getHotProjects"
```

---

### Task 5: `schema.ts` — add `deadline` to the Zod schemas

**Files:**
- Modify: `src/features/projects/schema.ts`

**Interfaces:**
- Consumes: none new.
- Produces: `projectCreateSchema` / `projectUpdateSchema` now include `deadline: Date | null` in their parsed output (input: `"YYYY-MM-DD"` string or `""`).

- [ ] **Step 1: Replace the full contents of `src/features/projects/schema.ts`**

```ts
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
```

Note: `ProjectCreateInput`/`ProjectUpdateInput` switch from `z.infer` to `z.input` (matching `tasks/schema.ts`'s convention) since the transform makes input (`string`) and output (`Date | null`) types diverge — the dialog component (Task 7) builds the pre-transform string shape.

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Same pre-existing failures as Task 4 (not yet fixed) — no *new* errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/schema.ts
git commit -m "feat(projects): add deadline field to project create/update schemas"
```

---

### Task 6: `actions.ts` — persist `deadline`

**Files:**
- Modify: `src/features/projects/actions.ts`

**Interfaces:**
- Consumes: `projectCreateSchema` / `projectUpdateSchema` (Task 5).
- Produces: `createProject`, `updateProject`, `deleteProject`, `setProjectStatus` — same signatures as before, now persisting `deadline`.

- [ ] **Step 1: Update `createProject` to destructure and persist `deadline`**

In `src/features/projects/actions.ts`, change:

```ts
  const { name, description, status, color } = parsed.data;
  await db.project.create({
    data: {
      name,
      description: clean(description),
      status,
      color: clean(color),
    },
  });
```

to:

```ts
  const { name, description, status, deadline, color } = parsed.data;
  await db.project.create({
    data: {
      name,
      description: clean(description),
      status,
      deadline,
      color: clean(color),
    },
  });
```

- [ ] **Step 2: Update `updateProject` the same way**

Change:

```ts
  const { id, name, description, status, color } = parsed.data;
  await db.project.update({
    where: { id },
    data: {
      name,
      description: clean(description),
      status,
      color: clean(color),
    },
  });
```

to:

```ts
  const { id, name, description, status, deadline, color } = parsed.data;
  await db.project.update({
    where: { id },
    data: {
      name,
      description: clean(description),
      status,
      deadline,
      color: clean(color),
    },
  });
```

`deleteProject` and `setProjectStatus` are unchanged — `setProjectStatus` already exists and will be reused as-is by the inline stage select in Task 10.

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Same pre-existing failures as before (UI components not yet updated) — no new errors from this file.

- [ ] **Step 4: Commit**

```bash
git add src/features/projects/actions.ts
git commit -m "feat(projects): persist deadline in create/update actions"
```

---

### Task 7: `ProjectDialog` — add the deadline field

**Files:**
- Modify: `src/features/projects/components/project-dialog.tsx`

**Interfaces:**
- Consumes: `createProject`, `updateProject` (Task 6); `ProjectCreateInput`-shaped payload (pre-transform, so `deadline` is a string).

- [ ] **Step 1: Add `deadline` state and reset logic**

Add a `deadline` state next to the existing `status`/`color` state (around line 51-52):

```ts
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [deadline, setDeadline] = useState<string>("");
  const [color, setColor] = useState<string>(DEFAULT_PROJECT_COLOR);
```

Update the reset effect (around line 55-61) to also reset `deadline`, and format an existing project's `deadline` (a `Date | null`) back into the `"YYYY-MM-DD"` string the date input expects:

```ts
  useEffect(() => {
    if (!open) return;
    setName(project?.name ?? "");
    setDescription(project?.description ?? "");
    setStatus(project?.status ?? ProjectStatus.PLANNING);
    setDeadline(
      project?.deadline ? project.deadline.toISOString().slice(0, 10) : "",
    );
    setColor(project?.color ?? DEFAULT_PROJECT_COLOR);
  }, [open, project]);
```

- [ ] **Step 2: Include `deadline` in the submit payload**

Update `submit()` (around line 63-77):

```ts
  function submit() {
    start(async () => {
      const payload = { name, description, status, deadline, color };
      const res = isEdit
        ? await updateProject({ ...payload, id: project!.id })
        : await createProject(payload);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(isEdit ? "Проект обновлён" : "Проект создан");
      onOpenChange(false);
      router.refresh();
    });
  }
```

- [ ] **Step 3: Add the deadline input to the form**

In the `grid-cols-2` block (around line 118-158), add a third field below the existing Статус/Цвет grid — change the wrapping grid to accommodate a deadline row:

```tsx
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Статус</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROJECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-deadline">Дедлайн</Label>
              <Input
                id="project-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Цвет</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Цвет ${c}`}
                  className={cn(
                    "size-6 rounded-full border-2 transition-transform",
                    color === c
                      ? "scale-110 border-foreground"
                      : "border-transparent hover:scale-110",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
```

(This moves Цвет out of the 2-column grid into its own full-width row, since the grid is now Статус+Дедлайн.)

- [ ] **Step 4: Manual verification**

Run: `pnpm dev`, open `/projects`, click "Новый проект". Confirm: the dialog shows Название, Описание, Статус (6 options), Дедлайн (date picker), Цвет. Create a project with a deadline set, confirm it saves (no error toast) and appears in the list. Edit it, confirm the deadline field is pre-filled with the saved date.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Same remaining pre-existing failures (ProjectCard/ProjectList not yet updated) — no new errors from this file.

- [ ] **Step 6: Commit**

```bash
git add src/features/projects/components/project-dialog.tsx
git commit -m "feat(projects): add deadline date field to project dialog"
```

---

### Task 8: `ProjectCard` — stage badge color, progress bar, deadline line

**Files:**
- Modify: `src/features/projects/components/project-card.tsx`

**Interfaces:**
- Consumes: `ProjectWithProgress` (Task 4), `PROJECT_STATUS_BADGE_CLASS`, `DEADLINE_TONE_CLASS` (Task 3), `describeDeadline` (Task 2).

- [ ] **Step 1: Replace the full contents of `src/features/projects/components/project-card.tsx`**

```tsx
"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { describeDeadline } from "../progress";
import {
  DEADLINE_TONE_CLASS,
  DEFAULT_PROJECT_COLOR,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
} from "../constants";
import type { ProjectWithProgress } from "../queries";

export function ProjectCard({
  project,
  onEdit,
  onDelete,
}: {
  project: ProjectWithProgress;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const deadlineInfo = describeDeadline(new Date(), project.deadline);
  return (
    <div className="group relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20">
      <Link
        href={`/projects/${project.id}`}
        className="absolute inset-0 rounded-xl"
        aria-label={project.name}
      />
      <div className="flex items-start justify-between gap-2">
        <span
          className="mt-1 size-3 shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
        />
        <div className="relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-md p-1 text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-accent focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Действия"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit} className="cursor-pointer">
                <Pencil className="size-4" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onDelete}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="size-4" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <h3 className="mt-3 font-medium">{project.name}</h3>
      {project.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <Badge
          variant="secondary"
          className={PROJECT_STATUS_BADGE_CLASS[project.status]}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {project.taskCount} {pluralizeTasks(project.taskCount)}
        </span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${project.progress.percent ?? 0}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {project.progress.percent === null ? "Нет задач" : `${project.progress.percent}%`}
        </span>
        <span className={cn(DEADLINE_TONE_CLASS[deadlineInfo.tone])}>
          {deadlineInfo.label}
        </span>
      </div>
    </div>
  );
}

function pluralizeTasks(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "задача";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "задачи";
  return "задач";
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: Remaining failures now only in `project-list.tsx` (Task 9) — `ProjectCard`'s prop type changed from `ProjectWithCount` to `ProjectWithProgress`.

- [ ] **Step 3: Commit**

```bash
git add src/features/projects/components/project-card.tsx
git commit -m "feat(projects): show stage badge color, progress bar, deadline on project card"
```

---

### Task 9: `ProjectList` — filter chips + urgency sort

**Files:**
- Modify: `src/features/projects/components/project-list.tsx`
- Modify: `src/app/(app)/projects/page.tsx`

**Interfaces:**
- Consumes: `ProjectWithProgress` (Task 4), `rankProjectUrgency` (Task 2), `ProjectStatus` from `@prisma/client`.

- [ ] **Step 1: Update `src/app/(app)/projects/page.tsx` to pass the renamed type (no logic change needed — `getProjects()`'s return type changed automatically via Task 4)**

Confirm the file still reads:

```tsx
import type { Metadata } from "next";
import { ProjectList } from "@/features/projects/components/project-list";
import { getProjects } from "@/features/projects/queries";

export const metadata: Metadata = { title: "Проекты" };

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectList projects={projects} />;
}
```

No edit needed here — `getProjects()` already returns `ProjectWithProgress[]`.

- [ ] **Step 2: Replace the full contents of `src/features/projects/components/project-list.tsx`**

```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Plus } from "lucide-react";
import type { Project } from "@prisma/client";
import { ProjectStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import { ProjectCard } from "./project-card";
import { ProjectDialog } from "./project-dialog";
import { deleteProject } from "../actions";
import { rankProjectUrgency } from "../progress";
import type { ProjectWithProgress } from "../queries";

const ACTIVE_STATUSES: ProjectStatus[] = [
  ProjectStatus.PLANNING,
  ProjectStatus.IN_PROGRESS,
  ProjectStatus.REVIEW,
  ProjectStatus.ON_HOLD,
];

type ProjectFilter = "active" | "all" | "done" | "archived";

const FILTER_OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: "active", label: "В работе" },
  { value: "all", label: "Все" },
  { value: "done", label: "Завершены" },
  { value: "archived", label: "Архив" },
];

function filterProjects(projects: ProjectWithProgress[], filter: ProjectFilter) {
  switch (filter) {
    case "active":
      return projects.filter((p) => ACTIVE_STATUSES.includes(p.status));
    case "done":
      return projects.filter((p) => p.status === ProjectStatus.DONE);
    case "archived":
      return projects.filter((p) => p.status === ProjectStatus.ARCHIVED);
    case "all":
      return projects;
  }
}

export function ProjectList({ projects }: { projects: ProjectWithProgress[] }) {
  const router = useRouter();
  const [, startDelete] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>("active");

  const visible = useMemo(
    () => rankProjectUrgency(new Date(), filterProjects(projects, filter)),
    [projects, filter],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setDialogOpen(true);
  }

  function remove(project: ProjectWithProgress) {
    const count = project.taskCount;
    const warning =
      count > 0
        ? `\n\n${count} задач(и) останутся, но потеряют привязку к проекту.`
        : "";
    if (!window.confirm(`Удалить проект «${project.name}»?${warning}`)) return;
    startDelete(async () => {
      const res = await deleteProject(project.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Проект удалён");
      router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Проекты"
        description="Сгруппируйте задачи по проектам и отслеживайте их прогресс."
        action={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Новый проект
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              filter === f.value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={projects.length === 0 ? "Пока нет проектов" : "Нет проектов в этом фильтре"}
          description={
            projects.length === 0
              ? "Создайте первый проект, чтобы сгруппировать задачи."
              : "Попробуйте выбрать другой фильтр."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={() => openEdit(project)}
              onDelete={() => remove(project)}
            />
          ))}
        </div>
      )}

      <ProjectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        project={editing}
      />
    </>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, open `/projects`. Confirm: default filter is "В работе" and excludes Done/Archived projects; the list order matches urgency (overdue/soonest deadlines first); clicking each filter chip updates the visible set; empty states render correctly when a filter has no matches.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS with zero errors in `src/features/projects/**` (remaining errors, if any, would only be in Task 10/11 files not yet written).

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/components/project-list.tsx
git commit -m "feat(projects): sort project list by urgency, add stage filter chips"
```

---

### Task 10: Project detail page — inline stage select, progress bar, deadline, edit

**Files:**
- Create: `src/features/projects/components/project-detail-header.tsx`
- Modify: `src/app/(app)/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: `setProjectStatus` (existing, `actions.ts`); `ProjectDialog` (Task 7); `computeProjectProgress`, `describeDeadline` (Task 2); `PROJECT_STATUS_LABELS`, `PROJECT_STATUS_ORDER`, `PROJECT_STATUS_BADGE_CLASS`, `DEADLINE_TONE_CLASS` (Task 3); `getTasks` (existing, `tasks/queries.ts`, already returns `{ status: TaskStatus, ... }[]`).
- Produces: `ProjectDetailHeader` component — `{ project: Project; taskCount: number; progress: ProjectProgress }` props.

- [ ] **Step 1: Create `src/features/projects/components/project-detail-header.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import type { Project, ProjectStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { setProjectStatus } from "../actions";
import { describeDeadline, type ProjectProgress } from "../progress";
import {
  DEADLINE_TONE_CLASS,
  DEFAULT_PROJECT_COLOR,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_ORDER,
} from "../constants";
import { ProjectDialog } from "./project-dialog";

export function ProjectDetailHeader({
  project,
  taskCount,
  progress,
}: {
  project: Project;
  taskCount: number;
  progress: ProjectProgress;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const deadlineInfo = describeDeadline(new Date(), project.deadline);

  function onStatusChange(value: string) {
    start(async () => {
      const res = await setProjectStatus(project.id, value as ProjectStatus);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className="size-4 shrink-0 rounded-full"
          style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
        />
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>

        <Select value={project.status} onValueChange={onStatusChange} disabled={pending}>
          <SelectTrigger size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {PROJECT_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={() => setDialogOpen(true)} aria-label="Редактировать проект">
          <Pencil className="size-4" />
        </Button>
      </div>

      {project.description && (
        <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>
      )}

      <div className="mt-4 max-w-sm">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.percent ?? 0}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {progress.percent === null
              ? "Нет задач"
              : `${progress.percent}% (${progress.done}/${progress.total})`}
          </span>
          <span className={cn(DEADLINE_TONE_CLASS[deadlineInfo.tone])}>
            {deadlineInfo.label}
          </span>
        </div>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} project={project} />
    </div>
  );
}
```

Note: `Badge` and `PROJECT_STATUS_BADGE_CLASS` are imported but unused above — remove the `Badge` import (the inline `<Select>` replaces the static badge). Final import list should drop `Badge` and `PROJECT_STATUS_BADGE_CLASS` since neither is referenced in this component.

- [ ] **Step 2: Replace the full contents of `src/app/(app)/projects/[id]/page.tsx`**

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TasksView } from "@/features/tasks/components/tasks-view";
import { getTasks, getProjectsForPicker } from "@/features/tasks/queries";
import { getProject } from "@/features/projects/queries";
import { computeProjectProgress } from "@/features/projects/progress";
import { ProjectDetailHeader } from "@/features/projects/components/project-detail-header";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project ? project.name : "Проект" };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [tasks, projects] = await Promise.all([
    getTasks(id),
    getProjectsForPicker(),
  ]);

  return (
    <>
      <Link
        href="/projects"
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Все проекты
      </Link>

      <ProjectDetailHeader
        project={project}
        taskCount={tasks.length}
        progress={computeProjectProgress(tasks)}
      />

      <TasksView initialTasks={tasks} projects={projects} lockedProjectId={id} />
    </>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, open a project's detail page (`/projects/<id>`). Confirm: stage select shows the current stage and changing it persists (check `/projects` list reflects the change after navigating back); progress bar and percent/counts match the task list below; deadline line shows correct tone/label; pencil button opens the edit dialog pre-filled with current values.

- [ ] **Step 4: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: PASS with zero errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/projects/components/project-detail-header.tsx src/app/\(app\)/projects/\[id\]/page.tsx
git commit -m "feat(projects): inline stage select, progress, deadline on project detail page"
```

---

### Task 11: Dashboard "Горящие проекты" widget

**Files:**
- Create: `src/features/dashboard/components/hot-projects.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getHotProjects` (Task 4, `projects/queries.ts`); `describeDeadline` (Task 2); `PROJECT_STATUS_LABELS`, `PROJECT_STATUS_BADGE_CLASS`, `DEADLINE_TONE_CLASS` (Task 3); existing `Panel`/`Empty`/`cn` helpers already defined in `dashboard/page.tsx`.

- [ ] **Step 1: Create `src/features/dashboard/components/hot-projects.tsx`**

```tsx
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { describeDeadline } from "@/features/projects/progress";
import {
  DEADLINE_TONE_CLASS,
  DEFAULT_PROJECT_COLOR,
  PROJECT_STATUS_BADGE_CLASS,
  PROJECT_STATUS_LABELS,
} from "@/features/projects/constants";
import type { ProjectWithProgress } from "@/features/projects/queries";

export function HotProjects({ projects }: { projects: ProjectWithProgress[] }) {
  if (projects.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Нет активных проектов.</p>;
  }
  const now = new Date();
  return (
    <ul className="space-y-3 pt-1">
      {projects.map((project) => {
        const deadlineInfo = describeDeadline(now, project.deadline);
        return (
          <li key={project.id}>
            <Link
              href={`/projects/${project.id}`}
              className="block rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-accent"
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: project.color ?? DEFAULT_PROJECT_COLOR }}
                />
                <span className="flex-1 truncate text-sm">{project.name}</span>
                <Badge
                  variant="secondary"
                  className={cn("shrink-0", PROJECT_STATUS_BADGE_CLASS[project.status])}
                >
                  {PROJECT_STATUS_LABELS[project.status]}
                </Badge>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${project.progress.percent ?? 0}%` }}
                  />
                </div>
                <span className={cn("shrink-0 text-xs tabular-nums", DEADLINE_TONE_CLASS[deadlineInfo.tone])}>
                  {deadlineInfo.label}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Wire the widget into `src/app/(app)/dashboard/page.tsx`**

Add the import (alongside the other dashboard component imports, near line 20-23):

```ts
import { HotProjects } from "@/features/dashboard/components/hot-projects";
import { getHotProjects } from "@/features/projects/queries";
```

Add `FolderKanban` to the existing `lucide-react` import list (line 5-18) for the panel icon.

Fetch the data alongside the existing summary calls (around line 101-104):

```tsx
export default async function DashboardPage() {
  const s = await getDashboardSummary();
  const today = await getTodayFocus();
  const pulse = await getFinancePulse();
  const hotProjects = await getHotProjects();
  const now = new Date();
```

Add a new panel in the "Habits + Goals" grid section (around line 277-338), as a third column — change that grid's wrapper from `lg:grid-cols-2` to `lg:grid-cols-3` and add the panel after Goals:

```tsx
      {/* Habits + Goals + Projects */}
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <AnimatedIn delay={0.32}>
          <Panel title="Привычки" href="/habits" icon={Flame} accent="amber">
            {/* ...unchanged... */}
          </Panel>
        </AnimatedIn>

        <AnimatedIn delay={0.36}>
          <Panel title="Цели" href="/goals" icon={Target} accent="fuchsia">
            {/* ...unchanged... */}
          </Panel>
        </AnimatedIn>

        <AnimatedIn delay={0.4}>
          <Panel title="Горящие проекты" href="/projects" icon={FolderKanban} accent="violet">
            <HotProjects projects={hotProjects} />
          </Panel>
        </AnimatedIn>
      </div>
```

The existing "Subscriptions + Finance" section immediately below currently uses `delay={0.4}` and `delay={0.44}` — bump those two to `delay={0.44}` and `delay={0.48}` respectively so the stagger stays sequential, and bump the "Debts" section's `delay={0.48}` to `delay={0.52}`, and `SavingsInsightCard`'s `delay={0.52}` to `delay={0.56}`. (Purely cosmetic animation timing — functionally harmless to skip, but keeps the stagger consistent.)

- [ ] **Step 3: Manual verification**

Run: `pnpm dev`, open `/dashboard`. Confirm: "Горящие проекты" panel appears in the Habits/Goals row, shows up to 4 projects ordered by urgency, each with stage badge, progress bar, and deadline; clicking a project row navigates to its detail page; "Открыть" navigates to `/projects`. With zero non-terminal projects, confirm the empty-state message renders instead of an empty list.

- [ ] **Step 4: Type-check and full test suite**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: PASS with zero errors, all tests green.

- [ ] **Step 5: Lint**

Run: `pnpm lint`
Expected: PASS with no new warnings/errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/components/hot-projects.tsx src/app/\(app\)/dashboard/page.tsx
git commit -m "feat(dashboard): add Горящие проекты widget ranked by urgency"
```

---

## Final Verification

- [ ] Run `pnpm exec tsc --noEmit` — zero errors across the whole repo.
- [ ] Run `pnpm test` — all tests pass, including the new `progress.test.ts`.
- [ ] Run `pnpm lint` — no new issues.
- [ ] Run `pnpm build` — production build succeeds (catches the Windows path-casing and prerender issues called out in CLAUDE.md).
- [ ] Manual pass: create a project with a deadline in the past, one with a deadline in 2 days, one with no deadline, and one marked `DONE`. Confirm `/projects` (default filter) and the Dashboard widget both rank them: overdue first, then the 2-day one, then no-deadline; `DONE` is excluded from both until the "Завершены" filter is selected on `/projects`.
