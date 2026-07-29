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
