import type { AIProvider } from "./provider";

export const fakeAIProvider: AIProvider = {
  async streamReply(messages, handlers) {
    const latest = [...messages].reverse().find(message => message.role === "user");
    const parts = [
      `Here is a focused explanation of "${latest?.content ?? "this question"}". `,
      "You can branch from any sentence that feels unclear. ",
      "The new branch keeps the main canvas readable while preserving the source context."
    ];
    let content = "";
    for (const part of parts) {
      content += part;
      await handlers.onDelta(part);
    }
    return { content, model: "fake-inquara-stream" };
  },
  async completeSmallTask(messages) {
    const latest = [...messages].reverse().find(message => message.role === "user");
    return { content: summarizeFakeTitle(latest?.content ?? "New chat"), model: "fake-inquara-small" };
  }
};

function summarizeFakeTitle(content: string): string {
  const normalized = content.replace(/\s+/gu, " ").trim();
  return normalized.length > 48 ? `${normalized.slice(0, 47).trimEnd()}...` : normalized || "New chat";
}
