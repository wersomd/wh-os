import "server-only";
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { DebtStatus, GoalStatus, TaskStatus, TransactionType } from "@prisma/client";
import { db } from "@/lib/db";
import {
  getAccountsWithBalance,
  getBudgetsWithSpend,
  getFinanceInsights,
} from "@/features/finances/queries";
import { computeDebtTotals, isOverdue } from "@/features/debts/summary";
import { getDebtsView } from "@/features/debts/queries";
import { getCalendarItems, getUpcomingItems } from "@/features/calendar/queries";
import { buildTodayFocus, type FocusItem } from "./lib/today-focus";
import { computeFinancePulse, type FinancePulse } from "./lib/finance-pulse";

export async function getDashboardSummary() {
  const now = new Date();
  const endToday = endOfDay(now);
  const in7 = endOfDay(addDays(now, 7));

  const [
    dueTasks,
    openTaskCount,
    accounts,
    upcomingSubs,
    pinnedNotes,
    openDebts,
    activeGoals,
    upcoming,
    calendarMonthItems,
    monthlyTotals,
    insights,
  ] = await Promise.all([
    // Tasks due today or overdue, not finished.
    db.task.findMany({
      where: {
        status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
        dueDate: { not: null, lte: endToday },
      },
      orderBy: { dueDate: "asc" },
      take: 6,
      include: { project: { select: { name: true, color: true } } },
    }),
    db.task.count({
      where: { status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] } },
    }),
    getAccountsWithBalance(),
    db.subscription.findMany({
      where: { active: true, nextPaymentDate: { lte: in7 } },
      orderBy: { nextPaymentDate: "asc" },
      take: 6,
      include: { category: { select: { name: true } } },
    }),
    db.note.count({ where: { pinned: true } }),
    db.debt.findMany({
      where: { status: DebtStatus.OPEN },
      select: {
        direction: true,
        currency: true,
        status: true,
        dueDate: true,
        principal: true,
        payments: { select: { amount: true } },
      },
    }),
    db.goal.findMany({
      where: { status: GoalStatus.ACTIVE },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 8,
      include: { keyResults: { select: { done: true } } },
    }),
    getUpcomingItems(),
    getCalendarItems({ from: startOfMonth(now), to: endOfMonth(now) }),
    // This month income + expense totals
    db.transaction.groupBy({
      by: ["type"],
      where: {
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
        category: { name: { not: "Перевод" } },
      },
      _sum: { amount: true },
    }),
    getFinanceInsights(),
  ]);

  // Open debts → per-currency net balance + overdue count.
  const debtRows = openDebts.map((d) => {
    const paid = d.payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);
    return {
      direction: d.direction,
      currency: d.currency,
      status: d.status,
      dueDate: d.dueDate,
      remaining: Math.max(d.principal.toNumber() - paid, 0),
    };
  });
  const debtTotals = computeDebtTotals(debtRows);
  const overdueDebts = debtRows.filter((d) =>
    isOverdue({ dueDate: d.dueDate, status: d.status }, now),
  ).length;

  // Balance totals per currency (active accounts).
  const balances: Record<string, number> = {};
  for (const a of accounts) {
    if (a.archived) continue;
    balances[a.currency] = (balances[a.currency] ?? 0) + a.balance;
  }

  // Active goals with a computed progress %: numeric target → current/target,
  // otherwise key-results done/total.
  const goals = activeGoals.map((g) => {
    const target = g.targetValue ? g.targetValue.toNumber() : null;
    const current = g.currentValue.toNumber();
    const krTotal = g.keyResults.length;
    const krDone = g.keyResults.filter((k) => k.done).length;
    const progress =
      target && target > 0
        ? Math.min(100, Math.round((current / target) * 100))
        : krTotal > 0
          ? Math.round((krDone / krTotal) * 100)
          : 0;
    return { id: g.id, title: g.title, progress };
  });

  const monthIncome =
    monthlyTotals.find((r) => r.type === TransactionType.INCOME)?._sum.amount?.toNumber() ?? 0;
  const monthExpense =
    monthlyTotals.find((r) => r.type === TransactionType.EXPENSE)?._sum.amount?.toNumber() ?? 0;

  return {
    tasks: {
      due: dueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate as Date,
        priority: t.priority,
        project: t.project,
      })),
      openCount: openTaskCount,
    },
    balances,
    subscriptions: upcomingSubs.map((s) => ({
      id: s.id,
      name: s.name,
      amount: s.amount.toNumber(),
      currency: s.currency,
      nextPaymentDate: s.nextPaymentDate,
      icon: s.icon,
      category: s.category,
    })),
    pinnedNotes,
    debts: {
      totals: debtTotals,
      overdue: overdueDebts,
    },
    goals,
    upcoming: upcoming.slice(0, 7),
    calendarMonth: { month: startOfMonth(now), items: calendarMonthItems },
    financeThisMonth: { income: monthIncome, expense: monthExpense },
    insights,
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, currency: a.currency })),
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;

export async function getTodayFocus(): Promise<FocusItem[]> {
  const now = new Date();
  const tasks = await db.task.findMany({
    where: { completedAt: null, dueDate: { gte: startOfDay(now), lte: endOfDay(now) } },
    select: { id: true, title: true, dueDate: true, completedAt: true },
  });
  return buildTodayFocus({ tasks, now });
}

// Finance pulse widget: this month's budget spend, a 30-day expense
// sparkline, and net worth (accounts minus open debts). Gathers rows from
// the existing finance/debt helpers and hands them to the pure compute fn.
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
