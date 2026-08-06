# Projects: stages, deadlines, progress — design

## Problem

The Projects module (`src/features/projects`) currently shows only a coarse status
(Active/On hold/Completed/Archived) and a task count. There's no deadline on a
project, no completion percentage, and no cross-project view of what's most
urgent. The user manages several personal projects at once and wants a fast
answer to "what should I finish next" instead of opening each project to judge
its state.

## Goals

- A single, richer stage field per project (replacing the 4-value status).
- A project-level deadline, independent of task due dates.
- A computed completion percentage from the project's tasks.
- A cross-project "what's hot" view, both on `/projects` and on the Dashboard.

## Non-goals

- Per-project custom stages/Kanban columns (YAGNI — one fixed stage set for
  every project).
- Manual/weighted progress override — progress is always `done / total` tasks.
- Task-level UI changes beyond what's needed to compute progress.

## 1. Data model

`Project.status` (enum `ProjectStatus`) grows from 4 to 6 values. This reuses
the existing field/enum name rather than adding a parallel "stage" concept —
one field to read, filter, and keep in sync.

| Value | Label (RU) | Meaning |
|---|---|---|
| `PLANNING` | Планирование | Not started yet |
| `IN_PROGRESS` | В работе | Active work |
| `REVIEW` | Проверка | Wrapping up / checking results |
| `ON_HOLD` | На паузе | Paused |
| `DONE` | Готово | Finished |
| `ARCHIVED` | В архиве | Closed out, hidden from active views |

`PROJECT_STATUS_ORDER` (src/features/projects/constants.ts) is updated to this
order; it drives both the stage `<Select>` and the filter chip order.

Data migration maps existing rows:
- `ACTIVE` → `IN_PROGRESS`
- `ON_HOLD` → `ON_HOLD`
- `COMPLETED` → `DONE`
- `ARCHIVED` → `ARCHIVED`

Postgres enums can't have values removed in place, so the migration creates a
new `ProjectStatus` type with the 6 values, backfills the column via the
mapping above, swaps the column to the new type, and drops the old type. This
is a single Prisma migration with hand-written SQL (`prisma migrate dev
--create-only`, then edit).

New column: `Project.deadline DateTime?` (nullable, no default).

## 2. Progress and urgency (pure functions)

New file `src/features/projects/progress.ts`, following the existing
`dashboard/lib/*.ts` pattern of pure, unit-tested compute functions fed by
plain data (no Prisma types leaking in).

```ts
computeProjectProgress(tasks: { status: TaskStatus }[]): {
  done: number;
  total: number; // excludes CANCELLED tasks
  percent: number | null; // null when total === 0
}

rankProjectUrgency(now: Date, projects: {
  id: string;
  status: ProjectStatus;
  deadline: Date | null;
  percent: number | null;
  createdAt: Date;
}[]): typeof projects // sorted, DONE/ARCHIVED projects moved to the end, in original relative order
```

Sort rule for non-`DONE`/non-`ARCHIVED` projects: overdue first (most
overdue first), then soonest deadline first, then no-deadline projects last;
ties broken by `percent` descending, then `createdAt` descending.

Both functions get unit tests under `src/features/projects/__tests__/`.

## 3. Queries

`getProjects()` in `src/features/projects/queries.ts` changes its `include`
from `_count: { select: { tasks: true } }` to
`tasks: { select: { status: true } }`, then each project's progress is
computed via `computeProjectProgress`. The page/component layer calls
`rankProjectUrgency` to order the list.

New `getHotProjects(limit = 4)` — same shape, filtered to non-`DONE`/
non-`ARCHIVED`, ranked, sliced to `limit`. Used by the Dashboard widget.

## 4. `/projects` page

Default view: one list, sorted by `rankProjectUrgency`, filtered to
non-`DONE`/non-`ARCHIVED` by default. Filter chips above the list: Все / В
работе (`PLANNING`+`IN_PROGRESS`+`REVIEW`+`ON_HOLD`) / Завершены (`DONE`) /
Архив (`ARCHIVED`). Chips are client-side filters over the already-fetched,
already-ranked list (no extra query).

`ProjectCard` gains:
- Stage badge, color-coded (mapping below), replacing the current plain
  `secondary` badge.
- A thin progress bar + `NN%` (or "—" when there are no tasks), same visual
  pattern as the Dashboard's Goals/Habits progress bars.
- A deadline line: red text if overdue, amber if due within 3 days, muted
  otherwise, "без дедлайна" (muted) if unset.

Stage badge colors:
- `PLANNING` — neutral/slate
- `IN_PROGRESS` — violet (brand accent)
- `REVIEW` — amber
- `ON_HOLD` — sky
- `DONE` — emerald
- `ARCHIVED` — muted gray

## 5. Project detail page + dialog

Detail page (`/projects/[id]`): stage shown as an inline `<Select>` (changes
save immediately via a server action, no dialog needed) instead of a static
badge; progress bar under the title; deadline shown next to the stage select,
click-to-edit opens the existing edit dialog.

`ProjectDialog` (`project-dialog.tsx`): stage `<Select>` now lists all 6
values via the updated `PROJECT_STATUS_ORDER`; new deadline field (native
`<input type="date">`, matching the date input pattern already used
elsewhere in the app, e.g. tasks/goals dialogs). `projectCreateSchema` /
`projectUpdateSchema` (schema.ts) get an optional `deadline` field.

## 6. Dashboard widget

New panel "Горящие проекты" on `/dashboard` (`src/app/(app)/dashboard/page.tsx`),
using the existing `Panel` component, placed in the grid alongside the
Habits/Goals row. Shows up to 4
projects from `getHotProjects()`: color dot + name, small stage badge, mini
progress bar, deadline countdown (same `relativeDay`-style formatting already
used for the "Ближайшее" panel). Links to `/projects`.

`getDashboardSummary()` (dashboard/queries.ts) is not touched — the widget
fetches `getHotProjects()` independently, in parallel with the existing
`getDashboardSummary`/`getTodayFocus`/`getFinancePulse` calls in the page
component, to keep the projects query isolated from the large existing
summary query.

## Testing

- Unit tests for `computeProjectProgress` and `rankProjectUrgency` (edge
  cases: no tasks, all cancelled, no deadline, multiple overdue, ties).
- Manual verification via `/verify`-style pass: create/edit a project's
  stage and deadline, confirm the `/projects` list ordering and Dashboard
  widget reflect it.
