# Solid Minimalism and Kaspi-Style Finance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a white and graphite, Apple-inspired JinseiOS interface with a green accent, and make finance categories selected from a curated Kaspi-familiar catalog instead of entered as free text.

**Architecture:** Establish the visual system in global tokens and shared primitives before changing feature views. Extend the existing finance category model with activity, origin, group, and icon metadata, then use a single picker component in transaction entry. Refresh task, debt, and remaining feature layouts only through shared visual rules and focused component edits, without altering their business behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/Radix primitives, Prisma 6, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-solid-minimalism-finance-design.md`

## Global Constraints

- Read the relevant Next.js 15 documentation under `node_modules/next/dist/docs/` before editing Next.js application code.
- Light theme uses a white-first canvas; dark theme uses graphite; green is the sole product accent.
- Do not introduce gradients, glows, decorative animations, card-inside-card layouts, or electric-violet styles.
- Preserve all existing transactions and categories during migration.
- New ordinary income and expense transactions select an active category by ID; transfers remain system transactions and stay outside spending analytics.
- Use Lucide icons and existing UI primitives. Use `tabular-nums` for amounts.
- Validate at desktop and mobile widths in both themes before completion.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `src/app/globals.css` | Theme tokens, base typography, and restrained shared visual rules |
| `src/components/layout/{sidebar,topbar}.tsx` | App shell hierarchy and selected navigation treatment |
| `src/components/ui/{button,card,dialog,select}.tsx` | Token-aligned primitive surfaces and controls |
| `prisma/schema.prisma` + migration | Category origin, activity, group, and icon persistence |
| `prisma/seed.ts` | Idempotent preset category upsert |
| `src/features/finances/constants.ts` | Preset groups, labels, icons, and category metadata |
| `src/features/finances/components/category-picker.tsx` | Typed, grouped category selector used for a transaction |
| `src/features/finances/{schema,actions,queries}.ts` | Category ID validation and query shapes |
| `src/features/finances/components/*` | Finance information hierarchy and category management |
| `src/features/tasks/components/*` | List-first task workspace and quiet board treatment |
| `src/features/debts/components/*` | Debt summary and row-first layout |
| selected `src/features/*/components/*.tsx` | Minimal surface/layout sweep for remaining modules |

## Task 1: Establish the visual foundation and application shell

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/components/ui/select.tsx`
- Test: `src/components/shared/__tests__/brand-mark.test.tsx`

**Interfaces:**
- Consumes: existing semantic Tailwind tokens such as `bg-background`, `bg-card`, and `text-primary`.
- Produces: unchanged component public props with white/graphite/green presentation.

- [ ] **Step 1: Read the current Next.js app guidance and capture the current baseline**

Run:

```bash
find node_modules/next/dist/docs -type f | rg 'app|styling|css' | head -20
pnpm lint
pnpm test
```

Expected: identify the applicable Next 15 styling/app-router guidance and record the current lint/test result before visual changes.

- [ ] **Step 2: Add a token-level regression test for the product mark**

Extend `src/components/shared/__tests__/brand-mark.test.tsx` with:

```tsx
it("keeps the compact brand mark usable in the application shell", () => {
  const html = renderToStaticMarkup(<BrandMark withWordmark />);
  expect(html).toContain("JinseiOS");
  expect(html).toContain("人生");
});
```

- [ ] **Step 3: Run the focused test and confirm the baseline passes**

Run: `pnpm vitest run src/components/shared/__tests__/brand-mark.test.tsx`

Expected: PASS. The test protects branding while the shell is restyled.

- [ ] **Step 4: Implement the token and primitive refresh**

Replace violet semantic token values with the following directional token policy in `globals.css`:

```css
:root { --background: oklch(1 0 0); --primary: oklch(0.43 0.09 155); --radius: 0.5rem; }
.dark { --background: oklch(0.13 0.01 155); --primary: oklch(0.72 0.11 155); }
```

Keep every component using semantic variables. Remove high-elevation shadows from `Card`, use 8px maximum card radii, and retain shadow only for modal depth. In sidebar/topbar, render active navigation as a muted green surface with no neon treatment.

- [ ] **Step 5: Verify the foundation**

Run:

```bash
pnpm lint
pnpm vitest run src/components/shared/__tests__/brand-mark.test.tsx
```

Expected: PASS with no violet-specific application styles in the authenticated shell.

- [ ] **Step 6: Commit the foundation**

```bash
git add src/app/globals.css src/components/layout src/components/ui src/components/shared/__tests__/brand-mark.test.tsx
git commit -m "feat: add solid minimal visual foundation"
```

## Task 2: Extend category persistence and preset catalog

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822090000_add_finance_category_metadata/migration.sql`
- Modify: `prisma/seed.ts`
- Modify: `src/features/finances/constants.ts`
- Create: `src/features/finances/__tests__/categories.test.ts`

**Interfaces:**
- Produces: `CategoryKind` enum, `Category.kind`, `Category.active`, `Category.group`, `Category.icon`, and `FINANCE_CATEGORY_PRESETS`.
- Consumes: existing `Category.name`, `Category.type`, and unique `[name, type]` constraint.

- [ ] **Step 1: Write failing catalog tests**

Create `categories.test.ts`:

```ts
import { FINANCE_CATEGORY_PRESETS } from "../constants";

it("contains the Kaspi-familiar core expense categories exactly once", () => {
  const expenseNames = FINANCE_CATEGORY_PRESETS
    .filter((category) => category.type === "EXPENSE")
    .map((category) => category.name);
  expect(expenseNames).toEqual(expect.arrayContaining(["Продукты", "Кафе и рестораны", "Одежда и обувь"]));
  expect(new Set(expenseNames).size).toBe(expenseNames.length);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm vitest run src/features/finances/__tests__/categories.test.ts`

Expected: FAIL because `FINANCE_CATEGORY_PRESETS` does not exist.

- [ ] **Step 3: Add model fields and the immutable preset catalog**

Add the enum and fields:

```prisma
enum CategoryKind { SYSTEM PRESET CUSTOM }
model Category {
  kind   CategoryKind @default(CUSTOM)
  active Boolean      @default(true)
  group  String?
  icon   String?
}
```

Create a typed `FINANCE_CATEGORY_PRESETS` array containing every expense and income category from the approved spec. Reserve `Перевод` for `SYSTEM`; give every other preset `PRESET`. Add a seed `upsert` loop keyed by `name_type` so existing rows are updated only with missing metadata and missing rows are created.

- [ ] **Step 4: Run migration generation and focused tests**

Run:

```bash
pnpm prisma migrate dev --name add_finance_category_metadata
pnpm vitest run src/features/finances/__tests__/categories.test.ts
```

Expected: generated migration; PASS.

- [ ] **Step 5: Commit the category data layer**

```bash
git add prisma src/features/finances/constants.ts src/features/finances/__tests__/categories.test.ts
git commit -m "feat: add finance category presets"
```

## Task 3: Validate selected categories and remove free-text creation

**Files:**
- Modify: `src/features/finances/schema.ts`
- Modify: `src/features/finances/actions.ts`
- Modify: `src/features/finances/queries.ts`
- Create: `src/features/finances/__tests__/transaction-category.test.ts`

**Interfaces:**
- Consumes: `{ type, amount, date, accountId, categoryId, note }` for create/update transaction.
- Produces: `getTransactionCategories(type)` and server-side category ID/type validation.

- [ ] **Step 1: Write failing validation tests**

Create a pure exported validator in `schema.ts` and test it:

```ts
it("rejects an income category for an expense", () => {
  expect(validateCategoryType("EXPENSE", "INCOME")).toEqual({ error: "Категория не соответствует типу операции" });
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm vitest run src/features/finances/__tests__/transaction-category.test.ts`

Expected: FAIL because the validator is not exported.

- [ ] **Step 3: Implement ID-based schemas and action checks**

Change the transaction Zod schema to accept `categoryId: z.string().min(1, "Выберите категорию")`. Replace `resolveCategoryId(name, type)` with a query that verifies `{ id: categoryId, type, active: true }`. Return exact errors for missing, inactive, and mismatched categories. Keep transfer creation on the internal system category path.

- [ ] **Step 4: Verify category correctness and regression safety**

Run:

```bash
pnpm vitest run src/features/finances/__tests__/transaction-category.test.ts
pnpm lint
```

Expected: PASS; normal transactions can no longer create categories from arbitrary text.

- [ ] **Step 5: Commit transaction validation**

```bash
git add src/features/finances/{schema,actions,queries}.ts src/features/finances/__tests__/transaction-category.test.ts
git commit -m "feat: require selected finance categories"
```

## Task 4: Build the grouped category picker and management controls

**Files:**
- Create: `src/features/finances/components/category-picker.tsx`
- Modify: `src/features/finances/components/transaction-dialog.tsx`
- Modify: `src/features/finances/components/categories-tab.tsx`
- Modify: `src/features/finances/components/category-dialog.tsx`
- Create: `src/features/finances/components/__tests__/category-picker.test.tsx`

**Interfaces:**
- Consumes: `FinanceCategoryOption { id, name, type, group, icon, color, active, kind }`.
- Produces: `<CategoryPicker type value categories onValueChange />`.

- [ ] **Step 1: Write failing picker rendering tests**

Create:

```tsx
it("shows only active categories of the selected transaction type", () => {
  const html = renderToStaticMarkup(<CategoryPicker type="EXPENSE" value="food" categories={categories} onValueChange={() => undefined} />);
  expect(html).toContain("Продукты");
  expect(html).not.toContain("Зарплата");
  expect(html).not.toContain("Скрытая категория");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm vitest run src/features/finances/components/__tests__/category-picker.test.tsx`

Expected: FAIL because `CategoryPicker` does not exist.

- [ ] **Step 3: Implement a searchable grouped selector**

Use the existing Select primitive or a command-free dialog list. Render group headings, Lucide icons from a local fixed mapping, and an explicit `Другое` option. `TransactionDialog` stores a category ID and passes it to the server action. Categories tab allows rename/recolor/add/archive; it never permits editing `SYSTEM` transfer categories.

- [ ] **Step 4: Verify picker behavior**

Run:

```bash
pnpm vitest run src/features/finances/components/__tests__/category-picker.test.tsx
pnpm lint
```

Expected: PASS; no `<datalist>` or arbitrary category text input remains in `transaction-dialog.tsx`.

- [ ] **Step 5: Commit the category interface**

```bash
git add src/features/finances/components src/features/finances/queries.ts
git commit -m "feat: add grouped finance category picker"
```

## Task 5: Redesign finance as the primary workspace

**Files:**
- Modify: `src/features/finances/components/finances-view.tsx`
- Modify: `src/features/finances/components/transaction-list.tsx`
- Modify: `src/features/finances/components/analytics-tab.tsx`
- Modify: `src/features/finances/components/budgets-section.tsx`
- Modify: `src/features/finances/components/{account-dialog,transfer-dialog,savings-insight-card}.tsx`
- Test: `src/features/dashboard/lib/__tests__/finance-pulse.test.ts`

**Interfaces:**
- Consumes: existing account, transaction, budget, and insight query values plus enhanced category options.
- Produces: `Обзор`, `Операции`, `Категории`, and `Бюджеты` finance tabs without a separate analytics top-level tab.

- [ ] **Step 1: Add a focused analytics regression case**

Extend `finance-pulse.test.ts`:

```ts
it("omits system transfers from spending totals", () => {
  expect(calculateFinancePulse(transactionsWithTransfer).expense).toBe(18_420);
});
```

- [ ] **Step 2: Run the focused test and confirm current behavior**

Run: `pnpm vitest run src/features/dashboard/lib/__tests__/finance-pulse.test.ts`

Expected: PASS before the visual hierarchy changes.

- [ ] **Step 3: Implement the overview and row-first hierarchy**

Make balance the only large summary. Place monthly income and expense beside it as compact values. Move transaction history to a framed divider list. Use overview analytics in a compact period control, replace oversized category visuals with direct labels, and make savings insight optional below the core financial data. Keep all action labels and server calls intact.

- [ ] **Step 4: Verify finance rendering and logic**

Run:

```bash
pnpm vitest run src/features/dashboard/lib/__tests__/finance-pulse.test.ts
pnpm lint
pnpm build
```

Expected: PASS; finance keeps transfer exclusion and builds successfully.

- [ ] **Step 5: Commit the finance workspace**

```bash
git add src/features/finances src/features/dashboard/lib/__tests__/finance-pulse.test.ts
git commit -m "feat: redesign finance workspace"
```

## Task 6: Refresh tasks for list-first daily work

**Files:**
- Modify: `src/features/tasks/components/tasks-view.tsx`
- Modify: `src/features/tasks/components/{task-list,task-row,task-card,board,board-column,quick-add,view-switcher,task-filters,task-dialog}.tsx`
- Test: `src/features/projects/__tests__/progress.test.ts`

**Interfaces:**
- Consumes: existing task actions and `TaskWithProject` shape.
- Produces: unchanged task behavior with list as default view and a restrained optional board.

- [ ] **Step 1: Add a pure default-view regression test**

Export and test the default:

```ts
it("opens the task workspace in list mode", () => {
  expect(DEFAULT_TASK_VIEW).toBe("list");
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm vitest run src/features/tasks/__tests__/view-default.test.ts`

Expected: FAIL because the default is local board state.

- [ ] **Step 3: Implement the task presentation refresh**

Define and export `DEFAULT_TASK_VIEW = "list"`. Keep quick add and filters adjacent to the main action. Render task rows with stable checkbox, title, project, due date, priority, and menu areas. Retain board drag-and-drop but use muted column surfaces and remove lift/shadow decoration.

- [ ] **Step 4: Verify task behavior**

Run:

```bash
pnpm vitest run src/features/tasks/__tests__/view-default.test.ts src/features/projects/__tests__/progress.test.ts
pnpm lint
```

Expected: PASS; task actions, filtering, and board persistence remain unchanged.

- [ ] **Step 5: Commit the task workspace**

```bash
git add src/features/tasks
git commit -m "feat: redesign task workspace"
```

## Task 7: Redesign debt tracking around clear balances and rows

**Files:**
- Modify: `src/features/debts/components/debts-view.tsx`
- Modify: `src/features/debts/components/{debt-dialog,payment-dialog,debt-dates-dialog}.tsx`
- Modify: `src/features/debts/constants.ts`
- Test: `src/features/debts/__tests__/summary.test.ts`

**Interfaces:**
- Consumes: `computeDebtTotals`, `DebtView`, existing debt actions.
- Produces: clear `Я должен` / `Мне должны` values and compact per-debt payment action.

- [ ] **Step 1: Add debt total behavior tests**

Create:

```ts
it("keeps payable and receivable totals distinct", () => {
  expect(computeDebtTotals([iOwe, owedToMe]).KZT).toMatchObject({ iOwe: 20_000, owedToMe: 35_000, net: 15_000 });
});
```

- [ ] **Step 2: Run the focused test and confirm it passes**

Run: `pnpm vitest run src/features/debts/__tests__/summary.test.ts`

Expected: PASS; layout work begins from verified calculation behavior.

- [ ] **Step 3: Implement the debt presentation refresh**

Replace currency cards with an aligned summary strip. Keep counterparties grouped but use a named list header and rows rather than nested cards. Put remaining amount, due date, status text, payment icon action, and overflow actions into stable row columns. Standardize debt and payment dialogs with the refreshed primitive spacing.

- [ ] **Step 4: Verify debt behavior**

Run:

```bash
pnpm vitest run src/features/debts/__tests__/summary.test.ts
pnpm lint
```

Expected: PASS; no debt action or status calculation changes.

- [ ] **Step 5: Commit the debt workspace**

```bash
git add src/features/debts
git commit -m "feat: redesign debt workspace"
```

## Task 8: Apply the system to remaining authenticated modules

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/features/dashboard/components/{today-focus,finance-pulse}.tsx`
- Modify: `src/features/{calendar,files,goals,health,journal,links,notes,projects,subscriptions,wishlist}/components/*.tsx`
- Modify: `src/features/jarvis/components/jarvis-bar.tsx`
- Test: existing component tests under `src/components/shared/__tests__/`

**Interfaces:**
- Consumes: shared tokens and primitive APIs from Task 1.
- Produces: visual consistency without changing feature queries, actions, routes, or data contracts.

- [ ] **Step 1: Add a static visual-policy audit command**

Run:

```bash
rg -n 'text-violet|bg-violet|shadow-(lg|xl|2xl)|rounded-2xl' src/app/'(app)' src/features src/components --glob '*.{tsx,css}'
```

Expected: current output identifies every remaining violet/high-elevation/oversized-radius surface to remove or justify.

- [ ] **Step 2: Replace component-by-component visual violations**

For each listed authenticated module, replace `rounded-xl`/`rounded-2xl` card stacks with one of: an unframed constrained section, an 8px compact tool surface, or a framed divider list. Replace violet styles with `primary` or semantic tokens. Preserve each component's props, queries, actions, and route links.

- [ ] **Step 3: Verify shared rendering tests and policy output**

Run:

```bash
pnpm vitest run src/components/shared/__tests__ src/features/dashboard/lib/__tests__
rg -n 'text-violet|bg-violet|shadow-(lg|xl|2xl)' src/app/'(app)' src/features src/components --glob '*.{tsx,css}'
```

Expected: tests PASS; the audit has no remaining application violet or large decorative shadow usage outside third-party primitive transition internals.

- [ ] **Step 4: Commit the application-wide sweep**

```bash
git add src/app/'(app)' src/features src/components
git commit -m "feat: apply solid minimalism across modules"
```

## Task 9: Run end-to-end verification and visual QA

**Files:**
- Modify only if verification identifies a specific defect.
- Test: `src/**/*.test.{ts,tsx}`

**Interfaces:**
- Consumes: completed application and finance category flow.
- Produces: verified light/dark responsive UI and a passing production build.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
pnpm lint
pnpm test
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 2: Start the application and inspect key routes in both themes**

Run:

```bash
pnpm dev
```

Inspect `/dashboard`, `/finances`, `/tasks`, and `/debts` at 1440px and 390px. In `/finances`, open the transaction dialog, switch income/expense, select a category, and confirm only compatible active categories appear. Toggle light/dark theme and confirm no text or controls overlap.

- [ ] **Step 3: Check runtime evidence**

Run browser checks for console errors and capture screenshots of the finance picker, task list, and debt rows in dark and light theme.

Expected: no client errors, no visual clipping, no empty surfaces, and no cyan/violet/neon visual regressions.

- [ ] **Step 4: Commit concrete QA fixes only when they exist**

Run `git status --short` after visual inspection. If it is empty, do not create
a commit. If a visual defect required a fix, stage only the files changed by
that fix and commit with:

```bash
git commit -m "fix: polish solid minimalism QA findings"
```

## Self-Review

- Spec coverage: Tasks 1 and 8 cover app-wide Apple-inspired visual discipline; Tasks 2-5 cover preset category data, selection, validation, finance hierarchy, and transfer exclusion; Tasks 6-7 cover the highest-use task and debt modules; Task 9 covers desktop/mobile and theme verification.
- Placeholder scan: no implementation placeholders are used; generated Prisma migration timestamp is intentionally supplied by the migration command.
- Type consistency: `FINANCE_CATEGORY_PRESETS`, `FinanceCategoryOption`, `CategoryPicker`, `categoryId`, and `DEFAULT_TASK_VIEW` are introduced before their consumers.
