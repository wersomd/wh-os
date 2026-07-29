# JinseiOS Rebrand + Dashboard Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand Wediff → JinseiOS (人生 logomark, calm graphite + muted-indigo palette) and add two dashboard widgets — a "Today" focus block and a Finance Pulse.

**Architecture:** Pure aggregation helpers (unit-testable, no DB) live under `src/features/dashboard/lib/`; thin Prisma wrappers in `src/features/dashboard/queries.ts` call the existing finance helpers and delegate to the pure functions. Presentational components consume plain data. Palette lives entirely in `globals.css` tokens and cascades app-wide.

**Tech Stack:** Next 15 (App Router, Server Components), React 19, TypeScript, Tailwind v4 (CSS tokens), Prisma 6, date-fns, Vitest.

## Global Constraints

- Test runner: `pnpm test` (`vitest run`). Component tests render via `react-dom/server` `renderToStaticMarkup` (no RTL dependency in repo).
- Money: numbers converted from `Decimal` at the query boundary only; format with `formatMoney(amount: number, currency: string)` from `@/features/finances/money`, passing `siteConfig.defaultCurrency`. Never use float math on `Decimal`.
- Reuse existing finance helpers — do NOT reimplement balance/budget logic: `getAccountsWithBalance()`, `getBudgetsWithSpend()`, `getDebtsView()` in `src/features/finances/queries.ts` / `src/features/debts/queries.ts`.
- Dark-first. All color via CSS variables in `src/app/globals.css`; no hardcoded hex/oklch in components.
- Product name is exactly `JinseiOS`; logomark kanji is exactly `人生`.
- Russian UI copy.
- Query modules start with `import "server-only";`.

---

### Task 1: Rebrand — name, copy, and BrandMark

**Files:**
- Modify: `src/config/site.ts`
- Modify: `src/app/page.tsx`, `src/app/landing-client.tsx`, `src/features/auth/login-form.tsx`, `src/features/jarvis/system-prompt.ts`
- Create: `src/components/shared/brand-mark.tsx`
- Test: `src/config/__tests__/site.test.ts`, `src/components/shared/__tests__/brand-mark.test.tsx`

**Interfaces:**
- Produces: `siteConfig.name = "JinseiOS"`; `<BrandMark />` (default export React component rendering the `人生` logomark + optional `JinseiOS` wordmark), props `{ withWordmark?: boolean; className?: string }`.

- [ ] **Step 1: Write failing test for siteConfig**

```ts
// src/config/__tests__/site.test.ts
import { describe, it, expect } from "vitest";
import { siteConfig } from "@/config/site";

describe("siteConfig", () => {
  it("is branded JinseiOS", () => {
    expect(siteConfig.name).toBe("JinseiOS");
    expect(siteConfig.description).toMatch(/операционная система/i);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/config/__tests__/site.test.ts`
Expected: FAIL (name is "Wediff").

- [ ] **Step 3: Update siteConfig**

In `src/config/site.ts` set:
```ts
  name: "JinseiOS",
  description: "Личная операционная система жизни",
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/config/__tests__/site.test.ts` → PASS.

- [ ] **Step 5: Write failing test for BrandMark**

```tsx
// src/components/shared/__tests__/brand-mark.test.tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import BrandMark from "@/components/shared/brand-mark";

describe("BrandMark", () => {
  it("renders the 人生 logomark", () => {
    const html = renderToStaticMarkup(<BrandMark />);
    expect(html).toContain("人生");
  });
  it("shows the wordmark when asked", () => {
    const html = renderToStaticMarkup(<BrandMark withWordmark />);
    expect(html).toContain("JinseiOS");
  });
});
```

- [ ] **Step 6: Run test, verify it fails**

Run: `pnpm test src/components/shared/__tests__/brand-mark.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 7: Implement BrandMark**

```tsx
// src/components/shared/brand-mark.tsx
import { cn } from "@/lib/utils";

export default function BrandMark({
  withWordmark = false,
  className,
}: {
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-base font-semibold leading-none text-primary"
      >
        人生
      </span>
      {withWordmark && (
        <span className="text-lg font-semibold tracking-tight">JinseiOS</span>
      )}
    </span>
  );
}
```

- [ ] **Step 8: Run test, verify it passes**

Run: `pnpm test src/components/shared/__tests__/brand-mark.test.tsx` → PASS.

- [ ] **Step 9: Replace remaining "Wediff" copy**

In `src/app/page.tsx`, `src/app/landing-client.tsx`, `src/features/auth/login-form.tsx`, `src/features/jarvis/system-prompt.ts`: replace user-facing `Wediff` with `JinseiOS` (in the Jarvis system prompt, keep the meaning: "Ты — Джарвис, ассистент в приложении JinseiOS…"). Where a landing/login header renders the name, prefer `<BrandMark withWordmark />`.

- [ ] **Step 10: Verify no stray brand references**

Run: `grep -rin "wediff" src/ && echo "FOUND" || echo "clean"`
Expected: `clean`.

- [ ] **Step 11: Commit**

```bash
git add src/config src/components/shared/brand-mark.tsx src/components/shared/__tests__ src/config/__tests__ src/app/page.tsx src/app/landing-client.tsx src/features/auth/login-form.tsx src/features/jarvis/system-prompt.ts
git commit -m "feat(jinseios): rename Wediff → JinseiOS + 人生 BrandMark"
```

---

### Task 2: Palette tokens — graphite + muted indigo

**Files:**
- Modify: `src/app/globals.css` (lines ~18, ~31, ~41, ~54; and neutral hues)

**Interfaces:**
- Produces: updated `--primary` / `--ring` (muted indigo) app-wide. No code interface.

- [ ] **Step 1: Update accent tokens**

In `src/app/globals.css`:
- `:root` `--primary` → `oklch(0.55 0.13 265)`; `--ring` → `oklch(0.55 0.13 265)`.
- `.dark` `--primary` → `oklch(0.60 0.13 265)`; `--ring` → `oklch(0.60 0.13 265)`.
- Nudge neutral hue from `285` toward `260` on `--background`/`--card`/`--muted`/`--border` (keep chroma ≤ 0.006) for a cool graphite. Keep radius as-is.

Note on stat cards: `StatCard`/`Panel` surfaces (`bg-card`, `border-border`, `text-muted-foreground`) restyle automatically via these tokens. Their small per-module accent chips (the hardcoded `ACCENT` map: violet/amber/emerald/rose/sky) are **intentionally kept** — they give module wayfinding, and the calm effect comes from the graphite base + muted `--primary`. Do not unify them to indigo.

- [ ] **Step 2: Typecheck + build**

Run: `pnpm build`
Expected: build succeeds (CSS-only change).

- [ ] **Step 3: Visual check**

Run `pnpm dev`, open `/dashboard` in dark mode. Confirm accent is muted indigo (not electric violet) and surfaces read as graphite/sumi-ink with adequate contrast.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(jinseios): calm graphite + muted-indigo palette tokens"
```

---

### Task 3: ProgressBar primitive

**Files:**
- Create: `src/components/shared/progress-bar.tsx`
- Test: `src/components/shared/__tests__/progress-bar.test.tsx`

**Interfaces:**
- Produces: `clampPercent(value: number, max: number): number` (named export) and default `<ProgressBar value max className />`.

- [ ] **Step 1: Write failing test**

```tsx
// src/components/shared/__tests__/progress-bar.test.tsx
import { describe, it, expect } from "vitest";
import { clampPercent } from "@/components/shared/progress-bar";

describe("clampPercent", () => {
  it("computes a percentage", () => {
    expect(clampPercent(50, 200)).toBe(25);
  });
  it("clamps above 100", () => {
    expect(clampPercent(300, 200)).toBe(100);
  });
  it("returns 0 when max is 0", () => {
    expect(clampPercent(50, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/components/shared/__tests__/progress-bar.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// src/components/shared/progress-bar.tsx
import { cn } from "@/lib/utils";

export function clampPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

export default function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = clampPercent(value, max);
  const over = value > max;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full", over ? "bg-destructive" : "bg-primary")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/components/shared/__tests__/progress-bar.test.tsx` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/progress-bar.tsx src/components/shared/__tests__/progress-bar.test.tsx
git commit -m "feat(dashboard): ProgressBar primitive"
```

---

### Task 4: SparkLine primitive

**Files:**
- Create: `src/components/shared/spark-line.tsx`
- Test: `src/components/shared/__tests__/spark-line.test.ts`

**Interfaces:**
- Produces: `sparklinePoints(values: number[], width: number, height: number): string` (named export, SVG `points` string) and default `<SparkLine values width? height? className />`.

- [ ] **Step 1: Write failing test**

```ts
// src/components/shared/__tests__/spark-line.test.ts
import { describe, it, expect } from "vitest";
import { sparklinePoints } from "@/components/shared/spark-line";

describe("sparklinePoints", () => {
  it("returns empty string for no data", () => {
    expect(sparklinePoints([], 100, 20)).toBe("");
  });
  it("centres a single flat value", () => {
    expect(sparklinePoints([5], 100, 20)).toBe("0,10");
  });
  it("maps min to bottom and max to top", () => {
    const pts = sparklinePoints([0, 10], 10, 20).split(" ");
    expect(pts[0]).toBe("0,20"); // min → y=height
    expect(pts[1]).toBe("10,0"); // max → y=0
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/components/shared/__tests__/spark-line.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/components/shared/spark-line.tsx
export function sparklinePoints(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) return "";
  if (values.length === 1) return `0,${height / 2}`;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX);
      const y = span === 0 ? height / 2 : height - ((v - min) / span) * height;
      return `${x},${Math.round(y)}`;
    })
    .join(" ");
}

export default function SparkLine({
  values,
  width = 120,
  height = 28,
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const points = sparklinePoints(values, width, height);
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      aria-hidden
    >
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/components/shared/__tests__/spark-line.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/spark-line.tsx src/components/shared/__tests__/spark-line.test.ts
git commit -m "feat(dashboard): SparkLine primitive"
```

---

### Task 5: Today focus — pure builder

**Files:**
- Create: `src/features/dashboard/lib/today-focus.ts`
- Test: `src/features/dashboard/lib/__tests__/today-focus.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  ```ts
  export type FocusTask = { id: string; title: string; dueDate: Date | null; completedAt: Date | null };
  export type FocusHabit = { id: string; name: string };
  export type FocusItem = { kind: "task" | "habit"; id: string; title: string; href: string };
  export function buildTodayFocus(input: {
    tasks: FocusTask[];
    habits: FocusHabit[];
    doneHabitIds: string[];
    now: Date;
  }): FocusItem[];
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/features/dashboard/lib/__tests__/today-focus.test.ts
import { describe, it, expect } from "vitest";
import { buildTodayFocus } from "@/features/dashboard/lib/today-focus";

const now = new Date("2026-07-29T09:00:00");

describe("buildTodayFocus", () => {
  it("includes tasks due today that are not completed", () => {
    const items = buildTodayFocus({
      tasks: [{ id: "t1", title: "Отчёт", dueDate: new Date("2026-07-29T14:00:00"), completedAt: null }],
      habits: [],
      doneHabitIds: [],
      now,
    });
    expect(items).toEqual([{ kind: "task", id: "t1", title: "Отчёт", href: "/tasks" }]);
  });

  it("excludes completed tasks and tasks due other days", () => {
    const items = buildTodayFocus({
      tasks: [
        { id: "t1", title: "Done", dueDate: now, completedAt: now },
        { id: "t2", title: "Tomorrow", dueDate: new Date("2026-07-30T09:00:00"), completedAt: null },
      ],
      habits: [],
      doneHabitIds: [],
      now,
    });
    expect(items).toEqual([]);
  });

  it("includes habits not yet done today, after tasks", () => {
    const items = buildTodayFocus({
      tasks: [{ id: "t1", title: "Отчёт", dueDate: now, completedAt: null }],
      habits: [{ id: "h1", name: "Чтение" }, { id: "h2", name: "Спорт" }],
      doneHabitIds: ["h2"],
      now,
    });
    expect(items).toEqual([
      { kind: "task", id: "t1", title: "Отчёт", href: "/tasks" },
      { kind: "habit", id: "h1", title: "Чтение", href: "/habits" },
    ]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/features/dashboard/lib/__tests__/today-focus.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/features/dashboard/lib/today-focus.ts
import { isSameDay } from "date-fns";

export type FocusTask = { id: string; title: string; dueDate: Date | null; completedAt: Date | null };
export type FocusHabit = { id: string; name: string };
export type FocusItem = { kind: "task" | "habit"; id: string; title: string; href: string };

export function buildTodayFocus(input: {
  tasks: FocusTask[];
  habits: FocusHabit[];
  doneHabitIds: string[];
  now: Date;
}): FocusItem[] {
  const { tasks, habits, doneHabitIds, now } = input;
  const done = new Set(doneHabitIds);

  const taskItems: FocusItem[] = tasks
    .filter((t) => !t.completedAt && t.dueDate != null && isSameDay(t.dueDate, now))
    .map((t) => ({ kind: "task" as const, id: t.id, title: t.title, href: "/tasks" }));

  const habitItems: FocusItem[] = habits
    .filter((h) => !done.has(h.id))
    .map((h) => ({ kind: "habit" as const, id: h.id, title: h.name, href: "/habits" }));

  return [...taskItems, ...habitItems];
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/features/dashboard/lib/__tests__/today-focus.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/lib/today-focus.ts src/features/dashboard/lib/__tests__/today-focus.test.ts
git commit -m "feat(dashboard): today-focus pure builder"
```

---

### Task 6: Today focus — query + component + wire

**Files:**
- Modify: `src/features/dashboard/queries.ts` (add `getTodayFocus`)
- Create: `src/features/dashboard/components/today-focus.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx` (render below header)

**Interfaces:**
- Consumes: `buildTodayFocus`, `FocusItem` from Task 5.
- Produces: `getTodayFocus(): Promise<FocusItem[]>`; `<TodayFocus items={FocusItem[]} />`.

- [ ] **Step 1: Add the query**

```ts
// append to src/features/dashboard/queries.ts
import { endOfDay, startOfDay } from "date-fns";
import { buildTodayFocus, type FocusItem } from "./lib/today-focus";

export async function getTodayFocus(): Promise<FocusItem[]> {
  const now = new Date();
  const [tasks, habits, todayEntries] = await Promise.all([
    db.task.findMany({
      where: { completedAt: null, dueDate: { gte: startOfDay(now), lte: endOfDay(now) } },
      select: { id: true, title: true, dueDate: true, completedAt: true },
    }),
    db.habit.findMany({ select: { id: true, name: true } }),
    db.habitEntry.findMany({
      where: { date: { gte: startOfDay(now), lte: endOfDay(now) } },
      select: { habitId: true },
    }),
  ]);
  return buildTodayFocus({
    tasks,
    habits,
    doneHabitIds: todayEntries.map((e) => e.habitId),
    now,
  });
}
```

(If `queries.ts` already imports `db`/date-fns, merge imports rather than duplicating.)

- [ ] **Step 2: Verify query typechecks**

Run: `pnpm build` (or `pnpm exec tsc --noEmit`). Expected: no type errors from `getTodayFocus`.

- [ ] **Step 3: Implement the component**

```tsx
// src/features/dashboard/components/today-focus.tsx
import Link from "next/link";
import { CheckSquare, Repeat, Sun } from "lucide-react";
import type { FocusItem } from "../lib/today-focus";

export function TodayFocus({ items }: { items: FocusItem[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sun className="size-4 text-primary" /> Сегодня
      </h2>
      {items.length === 0 ? (
        <p className="mt-4 text-lg font-medium">На сегодня всё чисто ✦</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`}>
              <Link
                href={it.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-base transition-colors hover:bg-muted"
              >
                {it.kind === "task" ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Repeat className="size-4 text-primary" />
                )}
                <span className="truncate">{it.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Wire into the dashboard**

In `src/app/(app)/dashboard/page.tsx`: import `getTodayFocus` and `TodayFocus`, `await` the data alongside the existing summary fetch, and render `<TodayFocus items={today} />` directly below the greeting header, above the 6-stat grid (`<div className="grid grid-cols-2 …">`).

- [ ] **Step 5: Build + visual check**

Run: `pnpm build`, then `pnpm dev` → `/dashboard` shows the "Сегодня" block (or the empty state). Expected: renders without error.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/queries.ts src/features/dashboard/components/today-focus.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(dashboard): Today focus block"
```

---

### Task 7: Finance pulse — pure compute

**Files:**
- Create: `src/features/dashboard/lib/finance-pulse.ts`
- Test: `src/features/dashboard/lib/__tests__/finance-pulse.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PulseAccount = { balance: number; archived: boolean };
  export type PulseDebt = { direction: "I_OWE" | "OWED_TO_ME"; status: "OPEN" | "PAID"; remaining: number };
  export type PulseBudget = { amount: number; spent: number };
  export type PulseExpense = { date: Date; amount: number };
  export type FinancePulse = { spent: number; budget: number; netWorth: number; spark: number[] };
  export function computeFinancePulse(input: {
    accounts: PulseAccount[];
    debts: PulseDebt[];
    budgets: PulseBudget[];
    monthExpenses: PulseExpense[];
    now: Date;
  }): FinancePulse;
  ```

- [ ] **Step 1: Write failing test**

```ts
// src/features/dashboard/lib/__tests__/finance-pulse.test.ts
import { describe, it, expect } from "vitest";
import { computeFinancePulse } from "@/features/dashboard/lib/finance-pulse";

const now = new Date("2026-07-15T12:00:00"); // July has 31 days

describe("computeFinancePulse", () => {
  it("sums budgets and spend", () => {
    const p = computeFinancePulse({
      accounts: [],
      debts: [],
      budgets: [{ amount: 400000, spent: 300000 }, { amount: 100000, spent: 12000 }],
      monthExpenses: [],
      now,
    });
    expect(p.budget).toBe(500000);
    expect(p.spent).toBe(312000);
  });

  it("net worth = active account balances + receivables − liabilities", () => {
    const p = computeFinancePulse({
      accounts: [{ balance: 1_000_000, archived: false }, { balance: 999, archived: true }],
      debts: [
        { direction: "I_OWE", status: "OPEN", remaining: 200000 },
        { direction: "OWED_TO_ME", status: "OPEN", remaining: 50000 },
        { direction: "I_OWE", status: "PAID", remaining: 0 },
      ],
      budgets: [],
      monthExpenses: [],
      now,
    });
    expect(p.netWorth).toBe(1_000_000 - 200000 + 50000);
  });

  it("buckets month expenses into one value per day", () => {
    const p = computeFinancePulse({
      accounts: [],
      debts: [],
      budgets: [],
      monthExpenses: [
        { date: new Date("2026-07-01T10:00:00"), amount: 100 },
        { date: new Date("2026-07-01T20:00:00"), amount: 50 },
        { date: new Date("2026-07-03T09:00:00"), amount: 30 },
      ],
      now,
    });
    expect(p.spark).toHaveLength(31);
    expect(p.spark[0]).toBe(150); // day 1
    expect(p.spark[1]).toBe(0); // day 2
    expect(p.spark[2]).toBe(30); // day 3
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test src/features/dashboard/lib/__tests__/finance-pulse.test.ts` → FAIL.

- [ ] **Step 3: Implement**

```ts
// src/features/dashboard/lib/finance-pulse.ts
import { getDate, getDaysInMonth } from "date-fns";

export type PulseAccount = { balance: number; archived: boolean };
export type PulseDebt = { direction: "I_OWE" | "OWED_TO_ME"; status: "OPEN" | "PAID"; remaining: number };
export type PulseBudget = { amount: number; spent: number };
export type PulseExpense = { date: Date; amount: number };
export type FinancePulse = { spent: number; budget: number; netWorth: number; spark: number[] };

export function computeFinancePulse(input: {
  accounts: PulseAccount[];
  debts: PulseDebt[];
  budgets: PulseBudget[];
  monthExpenses: PulseExpense[];
  now: Date;
}): FinancePulse {
  const { accounts, debts, budgets, monthExpenses, now } = input;

  const budget = budgets.reduce((s, b) => s + b.amount, 0);
  const spent = budgets.reduce((s, b) => s + b.spent, 0);

  const assets = accounts.filter((a) => !a.archived).reduce((s, a) => s + a.balance, 0);
  const netWorth = debts
    .filter((d) => d.status === "OPEN")
    .reduce(
      (acc, d) => acc + (d.direction === "OWED_TO_ME" ? d.remaining : -d.remaining),
      assets,
    );

  const days = getDaysInMonth(now);
  const spark = Array.from({ length: days }, () => 0);
  for (const e of monthExpenses) {
    const idx = getDate(e.date) - 1;
    if (idx >= 0 && idx < days) spark[idx] += e.amount;
  }

  return { spent, budget, netWorth, spark };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test src/features/dashboard/lib/__tests__/finance-pulse.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/lib/finance-pulse.ts src/features/dashboard/lib/__tests__/finance-pulse.test.ts
git commit -m "feat(dashboard): finance-pulse pure compute"
```

---

### Task 8: Finance pulse — query + component + wire

**Files:**
- Modify: `src/features/dashboard/queries.ts` (add `getFinancePulse`)
- Create: `src/features/dashboard/components/finance-pulse.tsx`
- Modify: `src/app/(app)/dashboard/page.tsx` (render below the stat grid)

**Interfaces:**
- Consumes: `computeFinancePulse`, `FinancePulse` (Task 7); `getAccountsWithBalance`, `getBudgetsWithSpend` (`@/features/finances/queries`); `getDebtsView` (`@/features/debts/queries`); `ProgressBar` (Task 3); `SparkLine` (Task 4); `formatMoney` (`@/features/finances/money`).
- Produces: `getFinancePulse(): Promise<FinancePulse>`; `<FinancePulse data={FinancePulse} />`.

- [ ] **Step 1: Add the query**

```ts
// append to src/features/dashboard/queries.ts
import { TransactionType } from "@prisma/client";
import { getAccountsWithBalance, getBudgetsWithSpend } from "@/features/finances/queries";
import { getDebtsView } from "@/features/debts/queries";
import { computeFinancePulse, type FinancePulse } from "./lib/finance-pulse";
// reuse startOfMonth/endOfMonth from date-fns (merge with existing date-fns import)
import { endOfMonth, startOfMonth } from "date-fns";

export async function getFinancePulse(): Promise<FinancePulse> {
  const now = new Date();
  const [accounts, budgets, counterparties, expenses] = await Promise.all([
    getAccountsWithBalance(),
    getBudgetsWithSpend(),
    getDebtsView(),
    db.transaction.findMany({
      where: {
        type: TransactionType.EXPENSE,
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      select: { date: true, amount: true },
    }),
  ]);
  const debts = counterparties.flatMap((c) =>
    c.debts.map((d) => ({ direction: d.direction, status: d.status, remaining: d.remaining })),
  );
  return computeFinancePulse({
    accounts: accounts.map((a) => ({ balance: a.balance, archived: a.archived })),
    debts,
    budgets: budgets.map((b) => ({ amount: b.amount, spent: b.spent })),
    monthExpenses: expenses.map((e) => ({ date: e.date, amount: e.amount.toNumber() })),
    now,
  });
}
```

- [ ] **Step 2: Verify query typechecks**

Run: `pnpm exec tsc --noEmit`. Expected: no errors. (`d.direction`/`d.status` are Prisma enums whose string values match the `PulseDebt` union `"I_OWE" | "OWED_TO_ME"` / `"OPEN" | "PAID"`.)

- [ ] **Step 3: Implement the component**

```tsx
// src/features/dashboard/components/finance-pulse.tsx
import Link from "next/link";
import { Wallet } from "lucide-react";
import ProgressBar, { clampPercent } from "@/components/shared/progress-bar";
import SparkLine from "@/components/shared/spark-line";
import { formatMoney } from "@/features/finances/money";
import { siteConfig } from "@/config/site";
import type { FinancePulse as Pulse } from "../lib/finance-pulse";

export function FinancePulse({ data }: { data: Pulse }) {
  const pct = Math.round(clampPercent(data.spent, data.budget));
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-medium">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/15 text-primary">
            <Wallet className="size-3.5" />
          </span>
          Финансовый пульс
        </h2>
        <Link href="/finances" className="text-xs text-primary hover:underline">
          Открыть
        </Link>
      </div>

      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">Траты за месяц</span>
        <span className="tabular-nums">
          {formatMoney(data.spent, siteConfig.defaultCurrency)}{" "}
          <span className="text-muted-foreground">/ {formatMoney(data.budget, siteConfig.defaultCurrency)}</span>
        </span>
      </div>
      <ProgressBar value={data.spent} max={data.budget} className="mt-2" />
      <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">{pct}%</p>

      <div className="mt-4 text-primary">
        <SparkLine values={data.spark} width={240} height={32} className="h-8 w-full" />
      </div>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Чистые активы</span>
        <span className="font-medium tabular-nums">{formatMoney(data.netWorth)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire into the dashboard**

In `src/app/(app)/dashboard/page.tsx`: import `getFinancePulse` and `FinancePulse`, `await` alongside other fetches, render `<FinancePulse data={pulse} />` just below the 6-stat grid, above the existing panels.

- [ ] **Step 5: Full test + build + visual check**

Run: `pnpm test` (all pass), then `pnpm build`, then `pnpm dev` → `/dashboard` shows Finance Pulse with progress bar, sparkline, net worth in muted-indigo accent.

- [ ] **Step 6: Commit**

```bash
git add src/features/dashboard/queries.ts src/features/dashboard/components/finance-pulse.tsx "src/app/(app)/dashboard/page.tsx"
git commit -m "feat(dashboard): Finance Pulse widget"
```

---

## Notes for the implementer

- The dashboard page fetches data in the Server Component; add the two new `await`s to the existing `Promise.all` if one exists, rather than adding serial awaits.
- `formatMoney(amount, currency)` — always pass `siteConfig.defaultCurrency` (confirmed signature).
- Favicon/OG image regeneration (the 人生 mark as a static asset) is a follow-up asset task, out of scope for this plan.
