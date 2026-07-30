# Finance Insights Implementation Plan

**Goal:** Ship `SavingsInsightCard` (Babylon 10%-rule progress + tip of the
day) on `/finances` (Обзор) and the Dashboard, backed by the existing
`Setting` table (no migration).

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6, Zod,
shadcn/ui primitives, date-fns.

## Global Constraints

- Package manager: `/Users/wersomd/Library/pnpm/bin/pnpm` (or
  `export PATH="/opt/homebrew/bin:/Users/wersomd/Library/pnpm/bin:$PATH"`
  first).
- Money: DB `Decimal`, plain `number` on the client via `formatMoney`.
- Transfers are paired `EXPENSE`/`INCOME` transactions in category
  `"Перевод"` — never double-count them as real income/expense.
- Server Actions: `requireAuth()` first, then `revalidatePath(...)`.
- Verification: `pnpm build` must pass with no TypeScript errors after each
  task.

## File Map

| File | Action |
|------|--------|
| `src/features/finances/lib/quotes.ts` | Create |
| `src/features/finances/schema.ts` | Modify — add `savingsSettingsSchema` |
| `src/features/finances/queries.ts` | Modify — add `getFinanceInsights()` |
| `src/features/finances/actions.ts` | Modify — add `updateSavingsSettings()` |
| `src/features/finances/components/savings-insight-card.tsx` | Create |
| `src/features/finances/components/finances-view.tsx` | Modify |
| `src/app/(app)/finances/page.tsx` | Modify |
| `src/features/dashboard/queries.ts` | Modify |
| `src/app/(app)/dashboard/page.tsx` | Modify |

---

## Task 1: Quotes list

Create `src/features/finances/lib/quotes.ts`:

```ts
export type Quote = { text: string; author?: string };

export const QUOTES: Quote[] = [
  { text: "Заплати сначала себе — отложи часть каждого дохода, прежде чем тратить.", author: "Джордж Клейсон, «Самый богатый человек в Вавилоне»" },
  { text: "Не трать больше десятой части дохода — остальное пусть работает на тебя." },
  { text: "Держи расходы ниже доходов, каким бы скромным он ни был — разница и есть богатство." },
  { text: "Заставь каждую сбережённую монету работать и приносить доход." },
  { text: "Подушка безопасности — это 3–6 месяцев расходов на отдельном счёте, недоступном для импульсивных трат." },
  { text: "Правило 50/30/20: 50% — необходимое, 30% — желаемое, 20% — сбережения и долги." },
  { text: "Импульсивная покупка чаще всего — решение эмоции, а не бюджета. Дай себе 24 часа на раздумье." },
  { text: "Долг под высокий процент съедает будущие сбережения быстрее, чем любая инвестиция их приносит." },
  { text: "Сложный процент — восьмое чудо света: чем раньше начал откладывать, тем меньше нужно откладывать." },
  { text: "Веди учёт каждого расхода хотя бы месяц — то, что не измеряешь, не можешь контролировать." },
  { text: "Крупная цель достижимее, если разбита на ежемесячный автоматический перевод." },
  { text: "Инфляция образа жизни — рост трат вслед за ростом дохода — главный враг накоплений." },
  { text: "Страхуй то, что не можешь себе позволить потерять, и не страхуй то, что можешь." },
];

export function pickQuoteOfDay(date: Date): Quote {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const diff = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - start;
  const dayOfYear = Math.floor(diff / 86_400_000);
  return QUOTES[dayOfYear % QUOTES.length];
}
```

- [ ] Verify `pnpm build` passes.
- [ ] Commit: `feat(finances): personal-finance quote list`

---

## Task 2: Settings schema + queries + action

**`src/features/finances/schema.ts`** — append:

```ts
export const savingsSettingsSchema = z.object({
  rate: z.coerce.number().min(1, "Минимум 1%").max(100, "Максимум 100%"),
  accountId: z.string().min(1).nullable(),
});
```

**`src/features/finances/queries.ts`** — append (imports: add `TransactionType`
already imported; add `pickQuoteOfDay` from `./lib/quotes`):

```ts
const SAVINGS_RATE_KEY = "finance.savingsRate";
const SAVINGS_ACCOUNT_KEY = "finance.savingsAccountId";
const DEFAULT_SAVINGS_RATE = 10;

export async function getFinanceInsights() {
  const now = new Date();
  const from = startOfMonth(now);
  const to = endOfMonth(now);

  const [rateSetting, accountSetting, incomeSum, savedSum] = await Promise.all([
    db.setting.findUnique({ where: { key: SAVINGS_RATE_KEY } }),
    db.setting.findUnique({ where: { key: SAVINGS_ACCOUNT_KEY } }),
    db.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        date: { gte: from, lte: to },
        category: { name: { not: "Перевод" } },
      },
      _sum: { amount: true },
    }),
    db.transaction.aggregate({
      where: {
        type: TransactionType.INCOME,
        date: { gte: from, lte: to },
        category: { name: "Перевод" },
        accountId:
          typeof accountSetting?.value === "string" ? accountSetting.value : "__none__",
      },
      _sum: { amount: true },
    }),
  ]);

  const savingsRate =
    typeof rateSetting?.value === "number" ? rateSetting.value : DEFAULT_SAVINGS_RATE;
  const savingsAccountId =
    typeof accountSetting?.value === "string" ? accountSetting.value : null;
  const income = incomeSum._sum.amount?.toNumber() ?? 0;
  const saved = savingsAccountId ? savedSum._sum.amount?.toNumber() ?? 0 : 0;

  return {
    income,
    savingsRate,
    savingsAccountId,
    saved,
    target: income * (savingsRate / 100),
    quote: pickQuoteOfDay(now),
  };
}

export type FinanceInsights = Awaited<ReturnType<typeof getFinanceInsights>>;
```

Note: the `savedSum` query with `accountId: "__none__"` when there's no
configured account is intentional — cheaper than branching into two code
paths, and `"__none__"` never matches a real cuid.

**`src/features/finances/actions.ts`** — add `savingsSettingsSchema` to the
existing schema import, then append:

```ts
// ── Savings settings ─────────────────────────────────────────────────────
export async function updateSavingsSettings(input: unknown): Promise<ActionResult> {
  await requireAuth();
  const parsed = savingsSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля" };
  }
  const { rate, accountId } = parsed.data;
  await db.$transaction([
    db.setting.upsert({
      where: { key: "finance.savingsRate" },
      create: { key: "finance.savingsRate", value: rate },
      update: { value: rate },
    }),
    db.setting.upsert({
      where: { key: "finance.savingsAccountId" },
      create: { key: "finance.savingsAccountId", value: accountId },
      update: { value: accountId },
    }),
  ]);
  revalidatePath("/finances");
  revalidatePath("/dashboard");
  return { ok: true };
}
```

- [ ] Verify `pnpm build` passes.
- [ ] Commit: `feat(finances): savings settings storage + getFinanceInsights query`

---

## Task 3: `SavingsInsightCard` component

Create `src/features/finances/components/savings-insight-card.tsx`
(`"use client"`). Props: `{ insights: FinanceInsights; accounts: { id: string; name: string; currency: string }[] }`.

Layout:
- Header: "Правило Вавилона" + gear/settings icon button opening a `Dialog`
  (pattern copied from `CategoryDialog`) with a number input (rate) and a
  `Select` of `accounts`, submitting `updateSavingsSettings`.
- If `savingsAccountId` is `null`: short prompt "Выберите счёт для
  накоплений" instead of the progress bar, still shows the tip section.
- Otherwise: "Цель на этот месяц: `target`" / "Отложено: `saved`", `ProgressBar`
  (`value=saved max=target`, treat `target === 0` as an empty state — "нет
  дохода в этом месяце"), percent label.
- Divider, then quote block: `insights.quote.text` + (if present) a smaller
  muted line with `insights.quote.author`.
- Currency: format using the savings account's own currency, found by
  matching `savingsAccountId` in `accounts`; fall back to `"KZT"` if not
  found.

- [ ] Verify `pnpm build` passes.
- [ ] Commit: `feat(finances): SavingsInsightCard component`

---

## Task 4: Wire into `/finances`

**`src/app/(app)/finances/page.tsx`** — add `getFinanceInsights` to the
`Promise.all` fetch, pass `insights` to `FinancesView`.

**`src/features/finances/components/finances-view.tsx`** — accept `insights`
prop, render `<SavingsInsightCard insights={insights} accounts={accounts} />`
inside the `tab === "overview"` branch, directly above the accounts grid
(before the `accounts.length === 0` check — always show it once at least one
account exists; if zero accounts, skip it same as the rest of Overview).

- [ ] Verify `pnpm build` passes.
- [ ] Commit: `feat(finances): show SavingsInsightCard on Обзор tab`

---

## Task 5: Wire into Dashboard

**`src/features/dashboard/queries.ts`** — import `getFinanceInsights` from
`@/features/finances/queries`, add it to the summary's `Promise.all`, spread
its result as `insights` on the returned object.

**`src/app/(app)/dashboard/page.tsx`** — add a new `Panel` in the bottom grid
(same row/pattern as the existing Goals/Subscriptions/Debt panels) titled
"Финансовый коуч", rendering `<SavingsInsightCard insights={s.insights}
accounts={s.accounts ?? accountsList} />`. If the page doesn't already fetch
raw accounts (it uses `s.balances`, a currency→total map), fetch
`getAccountsWithBalance()` alongside `getDashboardSummary()` in the page (not
inside the query function, to avoid an extra DB round trip inside
`Promise.all` that's already fetching accounts for balances) — reuse
whichever is already available; only add a new fetch if neither summary nor
page currently exposes per-account rows.

- [ ] Verify `pnpm build` passes.
- [ ] Commit: `feat(dashboard): SavingsInsightCard panel`

---

## Task 6: Manual verification

- [ ] `pnpm dev`, open `/finances` → Обзор: card renders, "Выберите счёт"
  prompt shows with no account configured.
- [ ] Set rate + pick an existing account via the settings dialog → saves,
  page refreshes, values persist on reload.
- [ ] Use the existing Transfer dialog to move money into the configured
  savings account → "Отложено" updates to reflect it (current month only).
- [ ] Log an income transaction → "Цель на этот месяц" increases
  proportionally.
- [ ] Open `/dashboard` → same card values match `/finances`.
- [ ] Reload the page on a different day (or manually check `pickQuoteOfDay`
  against `new Date()`) → quote is stable within a day.
