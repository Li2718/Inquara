import { describe, expect, it, vi } from "vitest";
import { createOpenAICompatibleProvider } from "../ai/openai-compatible-provider";

describe("OpenAI-compatible provider", () => {
  it("parses streamed chat completion deltas", async () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      "",
      "data: [DONE]",
      ""
    ].join("\n");
    const fetchMock = vi.fn(async () => new Response(body, { status: 200 }));
    const provider = createOpenAICompatibleProvider({
      baseUrl: "https://provider.example/v1",
      apiKey: "secret",
      model: "model-a",
      fetch: fetchMock
    });
    const deltas: string[] = [];

    const result = await provider.streamReply([{ role: "user", content: "Say hello" }], {
      onDelta(delta) {
        deltas.push(delta);
      }
    });

    expect(result).toEqual({ content: "Hello world", model: "model-a" });
    expect(deltas).toEqual(["Hello", " world"]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://provider.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer secret",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("uses the configured small model for one-shot small tasks", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "A better title" } }] }), { status: 200 }));
    const provider = createOpenAICompatibleProvider({
      baseUrl: "https://provider.example/v1",
      apiKey: "secret",
      model: "model-a",
      smallModel: "model-mini",
      fetch: fetchMock
    });

    const result = await provider.completeSmallTask([{ role: "user", content: "Name this chat" }]);

    expect(result).toEqual({ content: "A better title", model: "model-mini" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://provider.example/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "model-mini",
          messages: [{ role: "user", content: "Name this chat" }],
          stream: false
        })
      })
    );
  });
});
