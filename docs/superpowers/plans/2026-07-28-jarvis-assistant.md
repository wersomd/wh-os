# Jarvis Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ⌘K AI command bar ("Jarvis") that answers questions and, with per-write confirmation, mutates the 4 core modules (tasks, finances, debts, subscriptions) via Claude tool-use.

**Architecture:** A client island (`JarvisBar`) holds the conversation and calls two server actions. `runJarvis(messages)` drives a manual Claude agentic loop: read-tools execute immediately, write-tools pause and return a `pendingAction` for confirmation. `confirmJarvis(...)` executes (or declines) the write and resumes the loop. All Anthropic calls are server-only; tools reuse existing `features/*/{queries,actions}.ts`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `@anthropic-ai/sdk`, Zod v4, Prisma 6, Radix Dialog, lucide-react, date-fns.

## Global Constraints

- Node via Homebrew, package manager **pnpm** (full path per env). Use `pnpm` for installs.
- Model default `claude-opus-4-8`; **adaptive thinking omitted** (snappy command bar), `output_config.effort: "low"`, `max_tokens: 2048`. All in `config.ts`.
- `thinking: {type:"enabled", budget_tokens}` and `temperature`/`top_p` **400 on Opus 4.8** — never pass them.
- `disable_parallel_tool_use: true` — the loop assumes **one tool_use per assistant turn**.
- Anthropic key: `ANTHROPIC_API_KEY` in `.env`, read server-side only. Never import the SDK into a client component.
- Money: `Decimal(14,2)`, default currency **KZT**. Never float in DB (existing actions handle this).
- Existing write actions take `input: unknown`, self-validate with Zod, return `{ ok: true } | { error: string }`. Jarvis passes plain objects to them.
- Russian UI copy (project is single-user, Russian).
- Reuse existing `queries.ts`/`actions.ts` — do NOT reimplement business logic.

---

## File Structure

- Create `src/features/jarvis/config.ts` — model + request params.
- Create `src/features/jarvis/client.ts` — Anthropic client factory + `isConfigured()`.
- Create `src/features/jarvis/types.ts` — message/pendingAction/result types.
- Create `src/features/jarvis/system-prompt.ts` — system prompt builder.
- Create `src/features/jarvis/tools/read.ts` — read tool defs + executors.
- Create `src/features/jarvis/tools/write.ts` — write tool defs + executors + summaries.
- Create `src/features/jarvis/tools/registry.ts` — merged registry + JSON-schema list for the API.
- Create `src/features/jarvis/actions.ts` — `runJarvis`, `confirmJarvis` server actions.
- Create `src/features/jarvis/components/jarvis-bar.tsx` — client ⌘K UI.
- Modify `src/app/(app)/layout.tsx` — mount `<JarvisBar/>`.
- Create `.env.example` entry (append `ANTHROPIC_API_KEY=`).
- Tests: `src/features/jarvis/tools/__tests__/registry.test.ts`, `src/features/jarvis/__tests__/loop.test.ts`.

> **Testing note:** the repo has no test runner yet. Task 1 adds `vitest` + a `test` script. If a runner already exists at implementation time, use it instead and skip the vitest install.

---

### Task 1: Install SDK, test runner, config & client

**Files:**
- Modify: `package.json` (deps + `test` script)
- Create: `src/features/jarvis/config.ts`
- Create: `src/features/jarvis/client.ts`
- Modify: `.env.example` (create if absent)
- Test: `src/features/jarvis/__tests__/client.test.ts`

**Interfaces:**
- Produces: `JARVIS_MODEL: string`, `JARVIS_REQUEST` (partial request params); `getAnthropic(): Anthropic`; `isJarvisConfigured(): boolean`.

- [ ] **Step 1: Install deps**

```bash
pnpm add @anthropic-ai/sdk
pnpm add -D vitest
```

- [ ] **Step 2: Add test script**

In `package.json` `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Append env example**

Append to `.env.example` (create the file if it does not exist):

```
# Jarvis AI assistant (https://console.anthropic.com)
ANTHROPIC_API_KEY=
```

- [ ] **Step 4: Write `config.ts`**

```ts
import type Anthropic from "@anthropic-ai/sdk";

// Single source of truth for model + tuning. Switch to "claude-haiku-4-5"
// here for cheaper/faster responses.
export const JARVIS_MODEL = "claude-opus-4-8";

// Shared request params (thinking omitted for a snappy command bar; effort low).
export const JARVIS_REQUEST = {
  model: JARVIS_MODEL,
  max_tokens: 2048,
  output_config: { effort: "low" },
} satisfies Partial<Anthropic.Messages.MessageCreateParams>;
```

- [ ] **Step 5: Write `client.ts`**

```ts
import Anthropic from "@anthropic-ai/sdk";

export function isJarvisConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
```

- [ ] **Step 6: Write the test**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { isJarvisConfigured } from "../client";

describe("isJarvisConfigured", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });
  it("false when key missing", () => {
    expect(isJarvisConfigured()).toBe(false);
  });
  it("true when key present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(isJarvisConfigured()).toBe(true);
  });
});
```

- [ ] **Step 7: Run tests**

Run: `pnpm test`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example src/features/jarvis
git commit -m "feat(jarvis): add anthropic sdk, config, client, test runner"
```

---

### Task 2: Types & system prompt

**Files:**
- Create: `src/features/jarvis/types.ts`
- Create: `src/features/jarvis/system-prompt.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type JarvisMessage = Anthropic.Messages.MessageParam`
  - `type PendingAction = { toolUseId: string; toolName: string; input: unknown; summary: string }`
  - `type JarvisResult = { messages: JarvisMessage[]; assistantText: string; pendingAction: PendingAction | null; done: boolean; error?: string }`
  - `buildSystemPrompt(now: Date): string`

- [ ] **Step 1: Write `types.ts`**

```ts
import type Anthropic from "@anthropic-ai/sdk";

export type JarvisMessage = Anthropic.Messages.MessageParam;

export type PendingAction = {
  toolUseId: string;
  toolName: string;
  input: unknown;
  summary: string;
};

export type JarvisResult = {
  messages: JarvisMessage[];
  assistantText: string;
  pendingAction: PendingAction | null;
  done: boolean;
  error?: string;
};
```

- [ ] **Step 2: Write `system-prompt.ts`**

```ts
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function buildSystemPrompt(now: Date): string {
  const today = format(now, "yyyy-MM-dd");
  const human = format(now, "EEEE, d MMMM yyyy", { locale: ru });
  return [
    "Ты — Джарвис, личный ассистент в приложении Wediff (личный Life-OS одного пользователя).",
    "Помогаешь с 4 модулями: задачи, финансы, долги, подписки.",
    `Сегодня ${today} (${human}). Валюта по умолчанию — KZT (тенге).`,
    "",
    "Правила:",
    "- Отвечай кратко и по-русски.",
    "- Для чтения данных сразу вызывай read-инструменты, не спрашивая разрешения.",
    "- Прежде чем что-то создать/изменить/удалить, вызови соответствующий write-инструмент —",
    "  система сама покажет пользователю подтверждение, тебе спрашивать не нужно.",
    "- Если для действия не хватает данных (например id счёта), сначала прочитай их read-инструментом.",
    "- Даты передавай в формате YYYY-MM-DD. Суммы — положительные числа.",
    "- Не выдумывай id: бери их только из результатов read-инструментов.",
  ].join("\n");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/jarvis/types.ts src/features/jarvis/system-prompt.ts
git commit -m "feat(jarvis): add types and system prompt"
```

---

### Task 3: Read tools

**Files:**
- Create: `src/features/jarvis/tools/read.ts`

**Interfaces:**
- Consumes: `getTasks` (`features/tasks/queries`), `getAccountsWithBalance`, `getTransactions`, `getCategoriesWithCount` (`features/finances/queries`), `getDebtsView` (`features/debts/queries`), `getSubscriptions` (`features/subscriptions/queries`).
- Produces: `readTools: ReadTool[]` where
  `type ReadTool = { name: string; description: string; schema: z.ZodType; execute: (input: unknown) => Promise<unknown> }`.

- [ ] **Step 1: Write `read.ts`**

```ts
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
    description: "Подписки: название, сумма, цикл, дата след. списания, активность.",
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit -p tsconfig.json`
Expected: no errors in `read.ts` (property names match the queries' return shapes; if a `select` omits a field, adjust the mapper to match the actual shape).

- [ ] **Step 3: Commit**

```bash
git add src/features/jarvis/tools/read.ts
git commit -m "feat(jarvis): add read tools over existing queries"
```

---

### Task 4: Write tools

**Files:**
- Create: `src/features/jarvis/tools/write.ts`

**Interfaces:**
- Consumes: `createTask`, `toggleDone` (`features/tasks/actions`); `createTransaction` (`features/finances/actions`); `addPayment` (`features/debts/actions`); `createSubscription`, `setSubscriptionActive` (`features/subscriptions/actions`).
- Produces: `writeTools: WriteTool[]` where
  `type WriteTool = { name: string; description: string; schema: z.ZodType; summarize: (input: unknown) => string; execute: (input: unknown) => Promise<{ ok: true } | { error: string }> }`.

Notes: `schema` here validates the model's arguments and produces a human summary; `execute` forwards to the existing action, which re-validates with its own Zod schema. Double validation is intentional (defence in depth).

- [ ] **Step 1: Write `write.ts`**

```ts
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

const markTaskDoneArgs = z.object({ id: z.string().min(1), title: z.string().optional() });

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
  date: date,
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
      "Записать платёж по долгу. Сначала прочитай долги через list_debts и возьми debtId.",
    schema: addDebtPaymentArgs,
    summarize: (i) => {
      const a = addDebtPaymentArgs.parse(i);
      return `Записать платёж ${a.amount} на ${a.date}${a.counterparty ? ` (${a.counterparty})` : ""}?`;
    },
    execute: (i) => {
      const a = addDebtPaymentArgs.parse(i);
      return addPayment({ debtId: a.debtId, amount: a.amount, date: a.date });
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
```

- [ ] **Step 2: Verify against existing schemas**

Confirm each `execute` object matches the target action's Zod input (`paymentCreateSchema` may accept extra fields like `note`; only required fields are passed here). Run:
`pnpm exec tsc --noEmit`
Expected: no errors. If an action's schema requires a field not passed here, add it to the args schema and forward it.

- [ ] **Step 3: Commit**

```bash
git add src/features/jarvis/tools/write.ts
git commit -m "feat(jarvis): add write tools with confirmation summaries"
```

---

### Task 5: Tool registry (+ JSON schema for the API)

**Files:**
- Create: `src/features/jarvis/tools/registry.ts`
- Test: `src/features/jarvis/tools/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `readTools`, `writeTools`.
- Produces:
  - `toolDefinitions: Anthropic.Messages.Tool[]` (name/description/input_schema for the API)
  - `getTool(name): { kind: "read" | "write"; ... } | undefined`
  - uses `zod-to-json-schema` conversion inline (no extra dep — hand-map via `z.toJSONSchema`).

> Zod v4 ships `z.toJSONSchema(schema)`. Use it to build `input_schema`.

- [ ] **Step 1: Write `registry.ts`**

```ts
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { readTools, type ReadTool } from "./read";
import { writeTools, type WriteTool } from "./write";

type Entry =
  | ({ kind: "read" } & ReadTool)
  | ({ kind: "write" } & WriteTool);

const entries: Entry[] = [
  ...readTools.map((t) => ({ kind: "read" as const, ...t })),
  ...writeTools.map((t) => ({ kind: "write" as const, ...t })),
];

const byName = new Map(entries.map((e) => [e.name, e]));

export function getTool(name: string): Entry | undefined {
  return byName.get(name);
}

export const toolDefinitions: Anthropic.Messages.Tool[] = entries.map((e) => {
  const jsonSchema = z.toJSONSchema(e.schema) as Record<string, unknown>;
  // Anthropic requires an object schema at the top level.
  const input_schema = {
    type: "object" as const,
    properties: (jsonSchema.properties as Record<string, unknown>) ?? {},
    required: (jsonSchema.required as string[]) ?? [],
  };
  return {
    name: e.name,
    description: e.description,
    input_schema,
  } satisfies Anthropic.Messages.Tool;
});
```

- [ ] **Step 2: Write the test**

```ts
import { describe, it, expect } from "vitest";
import { toolDefinitions, getTool } from "../registry";

describe("registry", () => {
  it("exposes every tool with an object input_schema", () => {
    expect(toolDefinitions.length).toBeGreaterThanOrEqual(11);
    for (const def of toolDefinitions) {
      expect(def.input_schema.type).toBe("object");
    }
  });
  it("tags read vs write", () => {
    expect(getTool("list_tasks")?.kind).toBe("read");
    expect(getTool("create_task")?.kind).toBe("write");
  });
  it("returns undefined for unknown tool", () => {
    expect(getTool("nope")).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/jarvis/tools/registry.ts src/features/jarvis/tools/__tests__/registry.test.ts
git commit -m "feat(jarvis): add tool registry + json schema"
```

---

### Task 6: Agentic loop server actions

**Files:**
- Create: `src/features/jarvis/actions.ts`
- Test: `src/features/jarvis/__tests__/loop.test.ts`

**Interfaces:**
- Consumes: `getAnthropic`, `isJarvisConfigured`, `JARVIS_REQUEST`, `buildSystemPrompt`, `toolDefinitions`, `getTool`, types.
- Produces:
  - `runJarvis(messages: JarvisMessage[]): Promise<JarvisResult>`
  - `confirmJarvis(messages: JarvisMessage[], pending: PendingAction, approved: boolean): Promise<JarvisResult>`

Both are `"use server"`. `runJarvis` is called with the full history (client appends the new user message before calling). The loop caps iterations at 8.

- [ ] **Step 1: Write the test (loop core, extracted pure fn)**

The loop's Anthropic call is impure; extract the "handle one assistant turn" decision into a pure helper `classifyToolUse` and test it.

```ts
import { describe, it, expect } from "vitest";
import { classifyToolUse } from "../actions";

describe("classifyToolUse", () => {
  it("read tool → execute", () => {
    expect(classifyToolUse("list_tasks")).toEqual({ kind: "read" });
  });
  it("write tool → confirm", () => {
    expect(classifyToolUse("create_task")).toEqual({ kind: "write" });
  });
  it("unknown → error", () => {
    expect(classifyToolUse("bogus")).toEqual({ kind: "error" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/features/jarvis/__tests__/loop.test.ts`
Expected: FAIL ("classifyToolUse is not exported").

- [ ] **Step 3: Write `actions.ts`**

```ts
"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, isJarvisConfigured } from "./client";
import { JARVIS_REQUEST } from "./config";
import { buildSystemPrompt } from "./system-prompt";
import { toolDefinitions, getTool } from "./tools/registry";
import type { JarvisMessage, JarvisResult, PendingAction } from "./types";

const MAX_ITERATIONS = 8;

export function classifyToolUse(
  name: string,
): { kind: "read" | "write" | "error" } {
  const tool = getTool(name);
  if (!tool) return { kind: "error" };
  return { kind: tool.kind };
}

function textOf(content: Anthropic.Messages.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

async function loop(messages: JarvisMessage[]): Promise<JarvisResult> {
  if (!isJarvisConfigured()) {
    return {
      messages,
      assistantText: "Джарвис не настроен: добавьте ANTHROPIC_API_KEY в .env.",
      pendingAction: null,
      done: true,
      error: "not_configured",
    };
  }

  const client = getAnthropic();
  const system = buildSystemPrompt(new Date());
  const working = [...messages];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let response: Anthropic.Messages.Message;
    try {
      response = await client.messages.create({
        ...JARVIS_REQUEST,
        system,
        tools: toolDefinitions,
        tool_choice: { type: "auto", disable_parallel_tool_use: true },
        messages: working,
      });
    } catch {
      return {
        messages: working,
        assistantText: "Не получилось связаться с Джарвисом. Попробуйте ещё раз.",
        pendingAction: null,
        done: true,
        error: "api_error",
      };
    }

    if (response.stop_reason === "refusal") {
      return {
        messages: working,
        assistantText: "Джарвис не может выполнить этот запрос.",
        pendingAction: null,
        done: true,
      };
    }

    working.push({ role: "assistant", content: response.content });

    const toolUse = response.content.find(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );

    if (!toolUse) {
      return {
        messages: working,
        assistantText: textOf(response.content),
        pendingAction: null,
        done: true,
      };
    }

    const tool = getTool(toolUse.name);
    if (!tool) {
      working.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: `Неизвестный инструмент: ${toolUse.name}`,
          },
        ],
      });
      continue;
    }

    if (tool.kind === "read") {
      let resultText: string;
      let isError = false;
      try {
        const parsed = tool.schema.parse(toolUse.input);
        const data = await tool.execute(parsed);
        resultText = JSON.stringify(data);
      } catch (e) {
        isError = true;
        resultText = e instanceof Error ? e.message : "Ошибка чтения";
      }
      working.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: isError,
            content: resultText,
          },
        ],
      });
      continue;
    }

    // write tool → validate & pause for confirmation
    try {
      tool.schema.parse(toolUse.input);
    } catch (e) {
      working.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            is_error: true,
            content: e instanceof Error ? e.message : "Некорректные данные",
          },
        ],
      });
      continue;
    }

    const pending: PendingAction = {
      toolUseId: toolUse.id,
      toolName: toolUse.name,
      input: toolUse.input,
      summary: tool.summarize(toolUse.input),
    };
    return {
      messages: working,
      assistantText: textOf(response.content),
      pendingAction: pending,
      done: false,
    };
  }

  return {
    messages: working,
    assistantText: "Слишком много шагов, остановился. Уточните запрос.",
    pendingAction: null,
    done: true,
  };
}

export async function runJarvis(
  messages: JarvisMessage[],
): Promise<JarvisResult> {
  return loop(messages);
}

export async function confirmJarvis(
  messages: JarvisMessage[],
  pending: PendingAction,
  approved: boolean,
): Promise<JarvisResult> {
  const tool = getTool(pending.toolName);
  if (!tool || tool.kind !== "write") {
    return {
      messages,
      assistantText: "Действие недоступно.",
      pendingAction: null,
      done: true,
      error: "bad_action",
    };
  }

  let resultText: string;
  let isError = false;
  if (!approved) {
    resultText = "Пользователь отклонил действие.";
  } else {
    try {
      const res = await tool.execute(pending.input);
      if ("error" in res) {
        isError = true;
        resultText = res.error;
      } else {
        resultText = "Готово.";
      }
    } catch (e) {
      isError = true;
      resultText = e instanceof Error ? e.message : "Ошибка выполнения";
    }
  }

  const withResult: JarvisMessage[] = [
    ...messages,
    {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: pending.toolUseId,
          is_error: isError,
          content: resultText,
        },
      ],
    },
  ];

  return loop(withResult);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm test src/features/jarvis/__tests__/loop.test.ts`
Expected: PASS (3 tests).

> `classifyToolUse` is exported from a `"use server"` module. Server Actions files may export non-async helpers; if the compiler complains that only async functions may be exported from `"use server"`, move `classifyToolUse` into `tools/registry.ts` and re-import it in the test.

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/jarvis/actions.ts src/features/jarvis/__tests__/loop.test.ts
git commit -m "feat(jarvis): add agentic loop with read-exec and write-confirm"
```

---

### Task 7: JarvisBar UI (⌘K)

**Files:**
- Create: `src/features/jarvis/components/jarvis-bar.tsx`

**Interfaces:**
- Consumes: `runJarvis`, `confirmJarvis` (server actions), `JarvisMessage`, `PendingAction`, `JarvisResult`.
- Produces: default-exported client component `<JarvisBar/>`.

UI behaviour: ⌘K/Ctrl+K opens a centered dialog. Text input; Enter submits. While awaiting, show "Думаю…". Render the latest assistant text. If `pendingAction`, show its `summary` with `[Ок] [Отмена]`. Esc closes and resets. Keep `messages` in state across the open session; reset on close.

- [ ] **Step 1: Write `jarvis-bar.tsx`**

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { runJarvis, confirmJarvis } from "@/features/jarvis/actions";
import type {
  JarvisMessage,
  JarvisResult,
  PendingAction,
} from "@/features/jarvis/types";

export default function JarvisBar() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState<PendingAction | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setInput("");
    setMessages([]);
    setAnswer("");
    setPending(null);
    setBusy(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function apply(result: JarvisResult) {
    setMessages(result.messages);
    setAnswer(result.assistantText);
    setPending(result.pendingAction);
    setBusy(false);
  }

  async function submit() {
    const text = input.trim();
    if (!text || busy) return;
    const next: JarvisMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(next);
    setInput("");
    setAnswer("");
    setPending(null);
    setBusy(true);
    apply(await runJarvis(next));
  }

  async function decide(approved: boolean) {
    if (!pending || busy) return;
    setBusy(true);
    const p = pending;
    setPending(null);
    apply(await confirmJarvis(messages, p, approved));
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
      onClick={close}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Sparkles className="size-4 text-violet-400" />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder="Спросите Джарвиса…  (например: сколько я потратил в июле?)"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </div>

        {(answer || pending || busy) && (
          <div className="max-h-[50vh] overflow-y-auto px-4 py-3 text-sm">
            {busy && !answer && (
              <p className="text-muted-foreground">Думаю…</p>
            )}
            {answer && <p className="whitespace-pre-wrap">{answer}</p>}
            {pending && (
              <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
                <p className="mb-2 font-medium">{pending.summary}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(true)}
                    className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500"
                  >
                    Ок
                  </button>
                  <button
                    onClick={() => decide(false)}
                    className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/jarvis/components/jarvis-bar.tsx
git commit -m "feat(jarvis): add ⌘K command bar UI"
```

---

### Task 8: Mount & manual verification

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Mount the bar**

Add the import and render `<JarvisBar/>` inside the shell. In `src/app/(app)/layout.tsx`:

```tsx
import JarvisBar from "@/features/jarvis/components/jarvis-bar";
```

and just before the closing `</div>` of the outer flex container, add:

```tsx
      <JarvisBar />
```

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: build succeeds (no client-side import of the SDK; `actions.ts` is `"use server"`).

- [ ] **Step 3: Manual smoke test**

Set `ANTHROPIC_API_KEY` in `.env`, run `pnpm dev`, log in, then:
- Press ⌘K → bar opens.
- "сколько задач у меня открыто?" → answers using `list_tasks` (no confirmation).
- "добавь задачу купить молоко на завтра" → shows confirmation card → Ок → task created (verify on /tasks).
- "добавь расход 1000 на еду сегодня" → asks/uses list_accounts, then confirmation → Отмена → nothing created.
- Toggle `ANTHROPIC_API_KEY` empty → bar shows the "не настроен" message.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/layout.tsx"
git commit -m "feat(jarvis): mount command bar in app shell"
```

---

## Self-Review Notes

- **Spec coverage:** ⌘K (Task 7), streaming — v1 ships **non-streaming** with a "Думаю…" indicator for reliability under the confirmation-pause model; streaming is a documented follow-up, not a v1 requirement. Read-immediate / write-confirm (Task 6). 4 modules × read/write tools (Tasks 3–4). Model in config (Task 1). Error handling incl. not-configured/refusal/api-error (Task 6) and Zod-as-tool_result (Task 6). Key server-only (Tasks 1, 6).
- **Reschedule task** from the spec table is dropped from v1 (needs a full task reload through `updateTask`); create + mark-done cover the daily flow. Add later if wanted.
- **Type consistency:** `JarvisResult`/`PendingAction`/`JarvisMessage` used identically across Tasks 2, 6, 7. `getTool().kind` used in Tasks 5, 6. `toolDefinitions` shape matches `Anthropic.Messages.Tool`.
- **Follow-ups (next specs):** dashboard redesign; Supabase/Vercel DevOps panel.
```
