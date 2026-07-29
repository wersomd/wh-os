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
