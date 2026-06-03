import { prisma } from "@inquara/db";
import type { CanvasEvent } from "@inquara/domain";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { AIProvider, ChatContextMessage } from "../ai/provider";
import { sendUserMessage } from "../messages/service";
import { resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let userId = "";
let canvasId = "";
let childNodeId = "";
let capturedContext: ChatContextMessage[] = [];
let capturedSmallTasks: ChatContextMessage[][] = [];

const capturingProvider: AIProvider = {
  async streamReply(messages, handlers) {
    capturedContext = messages;
    await handlers.onDelta("ok");
    return { content: "ok", model: "capturing-test-provider" };
  },
  async completeSmallTask(messages) {
    capturedSmallTasks.push(messages);
    return { content: "Generated concise title", model: "capturing-small-provider" };
  }
};

beforeEach(async () => {
  capturedContext = [];
  capturedSmallTasks = [];
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "messages@inquara.local", name: "Messages User" }
  });
  userId = user.id;

  const canvas = await prisma.canvas.create({
    data: { ownerId: user.id, title: "Message Canvas" }
  });
  canvasId = canvas.id;

  const rootNode = await prisma.canvasNode.create({
    data: {
      canvasId,
      title: "Main chat",
      x: 100,
      y: 100,
      width: 420,
      height: 520,
      collapsed: false,
      hiddenStateSnapshot: {
        hiddenChild: {
          hiddenAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          offsetX: 12,
          offsetY: 24,
          scrollTop: 36
        }
      }
    }
  });

  await prisma.nodeMessage.create({
    data: {
      canvasId,
      nodeId: rootNode.id,
      role: "user",
      content: "Explain transformer attention.",
      status: "complete"
    }
  });
  const sourceMessage = await prisma.nodeMessage.create({
    data: {
      canvasId,
      nodeId: rootNode.id,
      role: "assistant",
      content: "Attention decides which context matters before producing the next token.",
      status: "complete"
    }
  });

  const childNode = await prisma.canvasNode.create({
    data: {
      canvasId,
      title: "Follow-up",
      x: 560,
      y: 120,
      width: 420,
      height: 520,
      collapsed: false,
      parentNodeId: rootNode.id,
      sourceNodeId: rootNode.id,
      sourceMessageId: sourceMessage.id,
      sourceQuote: "which context matters",
      sourceRangeStart: 18,
      sourceRangeEnd: 39
    }
  });
  childNodeId = childNode.id;
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("message command services", () => {
  it("renames the main chat and canvas from the first question, then applies the small-model title", async () => {
    const emptyRoot = await createEmptyRootCanvas();

    const events: CanvasEvent[] = [];
    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-root-title",
        canvasId: emptyRoot.canvasId,
        nodeId: emptyRoot.nodeId,
        userMessageId: "message-user-root-title",
        assistantMessageId: "message-assistant-root-title",
        content: "How should we evaluate long-term memory in agent systems?"
      },
      capturingProvider,
      event => events.push(event)
    );

    const [canvas, node] = await Promise.all([
      prisma.canvas.findUniqueOrThrow({ where: { id: emptyRoot.canvasId } }),
      prisma.canvasNode.findUniqueOrThrow({ where: { id: emptyRoot.nodeId } })
    ]);

    expect(canvas.title).toBe("Generated concise title");
    expect(node.title).toBe("Generated concise title");
    expect(capturedSmallTasks[0]?.at(-1)?.content).toContain("How should we evaluate long-term memory");
    expect(events.some(event => event.type === "canvas.updated")).toBe(true);
    expect(events.filter(event => event.type === "canvas.node.updated")).toHaveLength(2);
    const firstNodeUpdate = events.find(event => event.type === "canvas.node.updated");
    expect(firstNodeUpdate?.type === "canvas.node.updated" ? firstNodeUpdate.node.hiddenStateSnapshot : null).toMatchObject({
      hiddenChild: {
        hiddenAt: "2026-01-01T00:00:00.000Z",
        offsetX: 12,
        offsetY: 24,
        scrollTop: 36
      }
    });
  });

  it("uses the selected quote as the follow-up title, then names it from quote and first question", async () => {
    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-follow-up-title",
        canvasId,
        nodeId: childNodeId,
        userMessageId: "message-user-follow-up-title",
        assistantMessageId: "message-assistant-follow-up-title",
        content: "Why does this part matter?"
      },
      capturingProvider,
      () => undefined
    );

    const childNode = await prisma.canvasNode.findUniqueOrThrow({ where: { id: childNodeId } });

    expect(childNode.title).toBe("Generated concise title");
    expect(capturedSmallTasks[0]?.at(-1)?.content).toContain("which context matters");
    expect(capturedSmallTasks[0]?.at(-1)?.content).toContain("Why does this part matter?");
  });

  it("renames an independent chat from its first question without changing the canvas title", async () => {
    const independentNode = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "New chat",
        x: 720,
        y: 320,
        width: 420,
        height: 520,
        collapsed: false
      }
    });

    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-independent-title",
        canvasId,
        nodeId: independentNode.id,
        userMessageId: "message-user-independent-title",
        assistantMessageId: "message-assistant-independent-title",
        content: "Compare vector clocks and CRDT merge strategies."
      },
      capturingProvider,
      () => undefined
    );

    const [canvas, node] = await Promise.all([
      prisma.canvas.findUniqueOrThrow({ where: { id: canvasId } }),
      prisma.canvasNode.findUniqueOrThrow({ where: { id: independentNode.id } })
    ]);

    expect(canvas.title).toBe("Message Canvas");
    expect(node.title).toBe("Generated concise title");
    expect(capturedSmallTasks[0]?.at(-1)?.content).toContain("Compare vector clocks");
  });

  it("keeps the fallback first-question title when small-model naming fails", async () => {
    const emptyRoot = await createEmptyRootCanvas();
    const failingTitleProvider: AIProvider = {
      async streamReply(_messages, handlers) {
        await handlers.onDelta("ok");
        return { content: "ok", model: "reply-provider" };
      },
      async completeSmallTask() {
        throw new Error("title model unavailable");
      }
    };

    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-title-fallback",
        canvasId: emptyRoot.canvasId,
        nodeId: emptyRoot.nodeId,
        userMessageId: "message-user-title-fallback",
        assistantMessageId: "message-assistant-title-fallback",
        content: "What is the first question fallback title?"
      },
      failingTitleProvider,
      () => undefined
    );

    const [canvas, node] = await Promise.all([
      prisma.canvas.findUniqueOrThrow({ where: { id: emptyRoot.canvasId } }),
      prisma.canvasNode.findUniqueOrThrow({ where: { id: emptyRoot.nodeId } })
    ]);

    expect(canvas.title).toBe("What is the first question fallback title?");
    expect(node.title).toBe("What is the first question fallback title?");
  });

  it("persists streamed assistant deltas before the final reply completes", async () => {
    const failingProvider: AIProvider = {
      async streamReply(_messages, handlers) {
        await handlers.onDelta("partial answer");
        throw new Error("provider timed out");
      },
      async completeSmallTask() {
        return { content: "Partial stream title", model: "small-test-provider" };
      }
    };

    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-partial-stream",
        canvasId,
        nodeId: childNodeId,
        userMessageId: "message-user-partial-1",
        assistantMessageId: "message-assistant-partial-1",
        content: "Start answering, then fail."
      },
      failingProvider,
      () => undefined
    );

    const assistantMessage = await prisma.nodeMessage.findFirstOrThrow({
      where: {
        canvasId,
        nodeId: childNodeId,
        role: "assistant"
      },
      orderBy: { createdAt: "desc" }
    });

    expect(assistantMessage.status).toBe("failed");
    expect(assistantMessage.content).toBe("partial answer");
    expect(assistantMessage.errorMessage).toBe("provider timed out");
  });

  it("adds hidden source conversation and selected quote context when replying in a follow-up node", async () => {
    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-follow-up-message",
        canvasId,
        nodeId: childNodeId,
        userMessageId: "message-user-followup-1",
        assistantMessageId: "message-assistant-followup-1",
        content: "What does this phrase mean?"
      },
      capturingProvider,
      () => undefined
    );

    expect(capturedContext[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining('selected this text from "Main chat"')
    });
    expect(capturedContext[0]?.content).toContain("which context matters");
    expect(capturedContext[0]?.content).toContain("assistant message");
    expect(capturedContext.some(message => message.content === "Explain transformer attention.")).toBe(true);
    expect(capturedContext.some(message => message.content.includes("Attention decides"))).toBe(true);
    expect(capturedContext.at(-1)).toMatchObject({
      role: "user",
      content: "What does this phrase mean?"
    });
  });

  it("keeps upstream source conversations when replying in a nested follow-up node", async () => {
    const childQuestion = await prisma.nodeMessage.create({
      data: {
        canvasId,
        nodeId: childNodeId,
        role: "user",
        content: "What does context refer to here?",
        status: "complete"
      }
    });
    const childAnswer = await prisma.nodeMessage.create({
      data: {
        canvasId,
        nodeId: childNodeId,
        role: "assistant",
        content: "Context refers to the earlier tokens and relationships the model can attend to.",
        status: "complete"
      }
    });
    const nestedNode = await prisma.canvasNode.create({
      data: {
        canvasId,
        title: "Nested follow-up",
        x: 1020,
        y: 160,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: childNodeId,
        sourceNodeId: childNodeId,
        sourceMessageId: childAnswer.id,
        sourceQuote: "earlier tokens",
        sourceRangeStart: 23,
        sourceRangeEnd: 37
      }
    });

    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-nested-follow-up-message",
        canvasId,
        nodeId: nestedNode.id,
        userMessageId: "message-user-nested-1",
        assistantMessageId: "message-assistant-nested-1",
        content: "How far back can it look?"
      },
      capturingProvider,
      () => undefined
    );

    expect(capturedContext[0]?.content).toContain('selected this text from "Follow-up"');
    expect(capturedContext[0]?.content).toContain("earlier tokens");
    expect(capturedContext.some(message => message.content === "Explain transformer attention.")).toBe(true);
    expect(capturedContext.some(message => message.content.includes("Attention decides"))).toBe(true);
    expect(capturedContext.some(message => message.content === childQuestion.content)).toBe(true);
    expect(capturedContext.some(message => message.content === childAnswer.content)).toBe(true);
    expect(capturedContext.at(-1)).toMatchObject({
      role: "user",
      content: "How far back can it look?"
    });
  });
});

async function createEmptyRootCanvas(): Promise<{ canvasId: string; nodeId: string }> {
  const canvas = await prisma.canvas.create({
    data: { ownerId: userId, title: "Message Canvas" }
  });
  const node = await prisma.canvasNode.create({
    data: {
      canvasId: canvas.id,
      title: "Main chat",
      x: 100,
      y: 100,
      width: 420,
      height: 520,
      collapsed: false,
      hiddenStateSnapshot: {
        hiddenChild: {
          hiddenAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
          offsetX: 12,
          offsetY: 24,
          scrollTop: 36
        }
      }
    }
  });

  return { canvasId: canvas.id, nodeId: node.id };
}
