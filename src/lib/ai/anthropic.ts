import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Le module IA n'est pas configuré pour cet environnement.");
  }

  client ??= new Anthropic({ apiKey });
  return client;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    return getAnthropicClient()[prop as keyof Anthropic];
  },
});

export const AI_MODEL = "claude-sonnet-4-6";

/**
 * Safely extract text from an Anthropic message response.
 * Concatenates all text blocks; returns "" when there are none — never throws,
 * unlike casting `content[0]` which crashes on empty or non-text content.
 */
export function messageText(message: Anthropic.Message): string {
  const parts: string[] = [];
  for (const block of message.content) {
    if (block.type === "text") parts.push(block.text);
  }
  return parts.join("\n");
}
