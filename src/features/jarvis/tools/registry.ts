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
