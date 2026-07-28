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
