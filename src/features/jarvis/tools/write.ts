import { z } from "zod";
import { TaskPriority, TransactionType } from "@prisma/client";
import { createTask, toggleDone } from "@/features/tasks/actions";
import { createTransaction } from "@/features/finances/actions";
import { addPayment } from "@/features/debts/actions";
import {
  createSubscription,
  setSubscriptionActive,
} from "@/features/subscriptions/actions";

export type WriteTool = {
  name: string;
  description: string;
  schema: z.ZodType;
  summarize: (input: unknown) => string;
  execute: (input: unknown) => Promise<{ ok: true } | { error: string }>;
};

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата в формате YYYY-MM-DD");

const createTaskArgs = z.object({
  title: z.string().min(1).max(300),
  dueDate: date.optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});

const markTaskDoneArgs = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
});

const addTransactionArgs = z.object({
  type: z.nativeEnum(TransactionType),
  amount: z.number().positive(),
  date: date,
  accountId: z.string().min(1),
  category: z.string().max(60).optional(),
  note: z.string().max(500).optional(),
});

const addDebtPaymentArgs = z.object({
  debtId: z.string().min(1),
  amount: z.number().positive(),
  accountId: z.string().min(1),
  paidOn: date,
  counterparty: z.string().optional(),
});

const addSubscriptionArgs = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  currency: z.enum(["KZT", "USD"]).optional(),
  nextPaymentDate: date,
});

const cancelSubscriptionArgs = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
});

export const writeTools: WriteTool[] = [
  {
    name: "create_task",
    description: "Создать задачу.",
    schema: createTaskArgs,
    summarize: (i) => {
      const a = createTaskArgs.parse(i);
      return `Создать задачу «${a.title}»${a.dueDate ? ` на ${a.dueDate}` : ""}?`;
    },
    execute: (i) => {
      const a = createTaskArgs.parse(i);
      return createTask({
        title: a.title,
        dueDate: a.dueDate ?? "",
        priority: a.priority ?? TaskPriority.MEDIUM,
      });
    },
  },
  {
    name: "mark_task_done",
    description: "Отметить задачу выполненной по её id.",
    schema: markTaskDoneArgs,
    summarize: (i) => {
      const a = markTaskDoneArgs.parse(i);
      return `Отметить задачу${a.title ? ` «${a.title}»` : ""} выполненной?`;
    },
    execute: (i) => {
      const a = markTaskDoneArgs.parse(i);
      return toggleDone(a.id, true);
    },
  },
  {
    name: "add_transaction",
    description:
      "Добавить транзакцию (доход/расход). Сначала прочитай счета через list_accounts и возьми accountId.",
    schema: addTransactionArgs,
    summarize: (i) => {
      const a = addTransactionArgs.parse(i);
      const kind = a.type === TransactionType.INCOME ? "доход" : "расход";
      return `Добавить ${kind} ${a.amount} на ${a.date}${a.category ? ` (${a.category})` : ""}?`;
    },
    execute: (i) => {
      const a = addTransactionArgs.parse(i);
      return createTransaction({
        type: a.type,
        amount: a.amount,
        date: a.date,
        accountId: a.accountId,
        category: a.category ?? "",
        note: a.note ?? "",
      });
    },
  },
  {
    name: "add_debt_payment",
    description:
      "Записать платёж по долгу. Сначала прочитай долги (list_debts) для debtId и счета (list_accounts) для accountId.",
    schema: addDebtPaymentArgs,
    summarize: (i) => {
      const a = addDebtPaymentArgs.parse(i);
      return `Записать платёж ${a.amount} на ${a.paidOn}${a.counterparty ? ` (${a.counterparty})` : ""}?`;
    },
    execute: (i) => {
      const a = addDebtPaymentArgs.parse(i);
      return addPayment({
        debtId: a.debtId,
        amount: a.amount,
        accountId: a.accountId,
        paidOn: a.paidOn,
      });
    },
  },
  {
    name: "add_subscription",
    description: "Добавить подписку.",
    schema: addSubscriptionArgs,
    summarize: (i) => {
      const a = addSubscriptionArgs.parse(i);
      return `Добавить подписку «${a.name}» — ${a.amount} ${a.currency ?? "KZT"}, след. списание ${a.nextPaymentDate}?`;
    },
    execute: (i) => {
      const a = addSubscriptionArgs.parse(i);
      return createSubscription({
        name: a.name,
        amount: a.amount,
        currency: a.currency ?? "KZT",
        nextPaymentDate: a.nextPaymentDate,
      });
    },
  },
  {
    name: "cancel_subscription",
    description: "Отменить (деактивировать) подписку по её id.",
    schema: cancelSubscriptionArgs,
    summarize: (i) => {
      const a = cancelSubscriptionArgs.parse(i);
      return `Отменить подписку${a.name ? ` «${a.name}»` : ""}?`;
    },
    execute: (i) => {
      const a = cancelSubscriptionArgs.parse(i);
      return setSubscriptionActive(a.id, false);
    },
  },
];
