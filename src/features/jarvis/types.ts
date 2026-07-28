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
