"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, isJarvisConfigured } from "./client";
import { JARVIS_REQUEST } from "./config";
import { buildSystemPrompt } from "./system-prompt";
import { toolDefinitions, getTool } from "./tools/registry";
import type { JarvisMessage, JarvisResult, PendingAction } from "./types";

const MAX_ITERATIONS = 8;

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
        assistantText:
          "Не получилось связаться с Джарвисом. Попробуйте ещё раз.",
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
