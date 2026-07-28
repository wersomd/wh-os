import { z } from "zod";
import { getTasks } from "@/features/tasks/queries";
import {
  getAccountsWithBalance,
  getTransactions,
} from "@/features/finances/queries";
import { getDebtsView } from "@/features/debts/queries";
import { getSubscriptions } from "@/features/subscriptions/queries";

export type ReadTool = {
  name: string;
  description: string;
  schema: z.ZodType;
  execute: (input: unknown) => Promise<unknown>;
};

const empty = z.object({}).strict();

export const readTools: ReadTool[] = [
  {
    name: "list_tasks",
    description:
      "Список задач пользователя (с проектом, статусом, приоритетом, сроком).",
    schema: empty,
    execute: async () => {
      const tasks = await getTasks();
      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        project: t.project?.name ?? null,
      }));
    },
  },
  {
    name: "list_accounts",
    description: "Счета пользователя с текущим балансом и валютой.",
    schema: empty,
    execute: async () => {
      const accounts = await getAccountsWithBalance();
      return accounts.map((a) => ({
        id: a.id,
        name: a.name,
        currency: a.currency,
        balance: a.balance,
        archived: a.archived,
      }));
    },
  },
  {
    name: "list_transactions",
    description:
      "Последние транзакции (тип, сумма, дата, счёт, категория). Для подсчёта трат/доходов за период фильтруй по дате сам.",
    schema: empty,
    execute: async () => {
      const rows = await getTransactions();
      return rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        date: r.date,
        account: r.account?.name ?? null,
        category: r.category?.name ?? null,
        note: r.note,
      }));
    },
  },
  {
    name: "list_debts",
    description:
      "Долги, сгруппированные по контрагенту: направление, валюта, остаток, срок, платежи.",
    schema: empty,
    execute: async () => getDebtsView(),
  },
  {
    name: "list_subscriptions",
    description:
      "Подписки: название, сумма, цикл, дата след. списания, активность.",
    schema: empty,
    execute: async () => {
      const subs = await getSubscriptions();
      return subs.map((s) => ({
        id: s.id,
        name: s.name,
        amount: s.amount,
        currency: s.currency,
        billingCycle: s.billingCycle,
        nextPaymentDate: s.nextPaymentDate,
        active: s.active,
      }));
    },
  },
];
