# Finance Insights — Savings Rule + Advice Card

**Date:** 2026-07-30
**Status:** Approved

## Goal

Add a persistently visible "financial coach" block on the Dashboard and on the
Finances page: tracks progress against the Babylon "pay yourself first" rule
(save N% of monthly income) and rotates a short personal-finance tip/quote.

This is additive to the existing analytics (donut chart, category breakdown,
category CRUD) shipped in `2026-06-30-finance-analytics-design.md` — that work
is unchanged.

## Scope

1. Configurable savings rule: `rate%` (default 10) + a designated savings
   `Account`, persisted via the existing (currently unused) `Setting`
   key/value table — no schema migration needed.
2. "Saved this month" is computed from existing data: transfers are already
   stored as a paired EXPENSE + INCOME transaction in the `Перевод` category
   (see `createTransfer` in `src/features/finances/actions.ts`). "Saved" =
   sum of INCOME `Перевод` transactions into the savings account, current
   month.
3. One new component, `SavingsInsightCard`, with two stacked sections:
   - Progress: target (`income × rate%`) vs actual saved this month, with a
     progress bar and an inline popover to edit rate + pick the savings
     account.
   - Tip of the day: one static quote/tip from a fixed list, chosen
     deterministically by day-of-year (no DB, no randomness, changes daily).
4. Placement:
   - Dashboard — new panel in the bottom grid, alongside Goals/Subscriptions/
     Debt panels.
   - `/finances` → Обзор tab — directly under the page header, above the
     accounts grid.
5. New shared query `getFinanceInsights()` in
   `src/features/finances/queries.ts`, consumed by both the Finances page and
   `dashboard/queries.ts` (dashboard already imports finance queries — see
   `getAccountsWithBalance`, `getBudgetsWithSpend`).

## Out of Scope

- Notifications, push, email digests
- User-editable/custom quote list (fixed, hardcoded set for MVP)
- Per-category savings rules (computed from total monthly income only)
- Multi-currency normalization (savings account amounts summed in its own
  currency, consistent with existing single-currency-per-account MVP pattern)
- A general `/settings` page — the rate/account editor lives inline in the
  card's popover

---

## Architecture

### Settings storage

Two rows in the existing `Setting` table (`key: String @id, value: Json`):

- `finance.savingsRate` → `number` (percentage, default `10` when absent)
- `finance.savingsAccountId` → `string | null` (an `Account.id`, default
  `null` when absent)

No new Prisma model. Read/write via two small helpers in
`src/features/finances/queries.ts` / `actions.ts`.

### Computation

`getFinanceInsights()`:

```
income (this month, all accounts, excludes "Перевод") — same filter already
  used by computeAnalytics / getDashboardSummary's financeThisMonth
savingsRate — from Setting, default 10
savingsAccountId — from Setting, default null
saved (this month) — sum of Transaction where
  type = INCOME, category.name = "Перевод", accountId = savingsAccountId,
  date within current month (0 if savingsAccountId is null)
target = income * (savingsRate / 100)
quote — pick from static QUOTES array by (dayOfYear % QUOTES.length)
```

Returns:

```ts
{
  income: number;
  savingsRate: number;
  savingsAccountId: string | null;
  saved: number;
  target: number;
  quote: { text: string; author?: string };
}
```

### Components

- `src/features/finances/lib/quotes.ts` — static array of 12–15 Russian
  personal-finance tips/quotes (`{ text: string; author?: string }[]`) plus a
  pure `pickQuoteOfDay(date: Date)` function.
- `src/features/finances/components/savings-insight-card.tsx` — client
  component. Props: `{ insights: FinanceInsights; accounts: AccountWithBalance[] }`.
  - Progress section: target/saved amounts (via `formatMoney`), progress bar
    (reuse `@/components/shared/progress-bar`), % label.
  - If `savingsAccountId` is null: prompt to pick an existing account (any
    type — most naturally `SAVINGS`, but not enforced) via a `<Select>` in
    the settings popover; no auto-creation of accounts.
  - Settings popover (reuse existing `Popover`/`Dialog` primitive already in
    `@/components/ui`): numeric input for rate (1–100), `<Select>` for
    account. Submits via a new server action `updateSavingsSettings`.
  - Tip section: renders `insights.quote.text` (+ `author` if present) below
    the progress block, visually separated (e.g. border-top), no
    interactivity.

### Server action

`updateSavingsSettings(input: { rate: number; accountId: string | null })` in
`src/features/finances/actions.ts`:
- `requireAuth()`
- Zod-validate `rate` as `number().min(1).max(100)`, `accountId` as
  `string().nullable()`
- Upsert both `Setting` rows
- `revalidatePath("/finances")` and `revalidatePath("/dashboard")`

### Data flow

```
FinancesPage (server)
  └─ fetches: accounts, transactions, categories, budgets, insights (NEW: getFinanceInsights())
        └─ FinancesView → OverviewTab renders <SavingsInsightCard /> above accounts grid

DashboardPage (server)
  └─ getDashboardSummary() gains `insights: FinanceInsights` (calls getFinanceInsights() internally)
        └─ renders <SavingsInsightCard /> as a bottom-grid Panel, using the existing accounts list already fetched for the page
```

---

## Files Changed / Created

| File | Change |
|------|--------|
| `src/features/finances/lib/quotes.ts` | new — static quotes + `pickQuoteOfDay` |
| `src/features/finances/queries.ts` | add `getFinanceInsights()`, `getFinanceSettings()` helper |
| `src/features/finances/actions.ts` | add `updateSavingsSettings()` |
| `src/features/finances/schema.ts` | add `savingsSettingsSchema` |
| `src/features/finances/components/savings-insight-card.tsx` | new |
| `src/features/finances/components/finances-view.tsx` | render card in Overview tab |
| `src/app/(app)/finances/page.tsx` | fetch + pass `insights` |
| `src/features/dashboard/queries.ts` | add `insights` to `getDashboardSummary()` |
| `src/app/(app)/dashboard/page.tsx` | new bottom-grid Panel rendering `SavingsInsightCard` |
