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
  }
};
