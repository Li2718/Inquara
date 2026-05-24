import type { AIProvider, ChatContextMessage } from "./provider";

type FetchLike = typeof fetch;

export type OpenAICompatibleProviderOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  fetch?: FetchLike;
};

export function createOpenAICompatibleProvider(options: OpenAICompatibleProviderOptions): AIProvider {
  const fetcher = options.fetch ?? fetch;
  const model = options.model;

  return {
    async streamReply(messages, handlers) {
      const response = await fetcher(chatCompletionsUrl(options.baseUrl), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${options.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: messages.map(toProviderMessage),
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`OpenAI-compatible request failed with status ${response.status}.`);
      }

      let content = "";
      for await (const delta of parseContentDeltas(response.body)) {
        content += delta;
        await handlers.onDelta(delta);
      }
      return { content, model };
    }
  };
}

function chatCompletionsUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

function toProviderMessage(message: ChatContextMessage) {
  return {
    role: message.role,
    content: message.content
  };
}

async function* parseContentDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const delta = parseSseLine(line);
      if (delta) yield delta;
    }
  }

  buffer += decoder.decode();
  if (buffer) {
    const delta = parseSseLine(buffer);
    if (delta) yield delta;
  }
}

function parseSseLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  if (!payload || payload === "[DONE]") return null;
  const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
  return parsed.choices?.[0]?.delta?.content ?? null;
}
