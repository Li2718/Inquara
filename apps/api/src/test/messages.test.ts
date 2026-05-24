import { prisma } from "@inquara/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { AIProvider, ChatContextMessage } from "../ai/provider";
import { sendUserMessage } from "../messages/service";

let userId = "";
let workspaceId = "";
let childNodeId = "";
let capturedContext: ChatContextMessage[] = [];

const capturingProvider: AIProvider = {
  async streamReply(messages, handlers) {
    capturedContext = messages;
    await handlers.onDelta("ok");
    return { content: "ok", model: "capturing-test-provider" };
  }
};

beforeEach(async () => {
  capturedContext = [];
  await prisma.canvasEdge.deleteMany();
  await prisma.nodeMessage.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: { email: "messages@inquara.local", name: "Messages User" }
  });
  userId = user.id;

  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, title: "Message Canvas" }
  });
  workspaceId = workspace.id;

  const rootNode = await prisma.canvasNode.create({
    data: {
      workspaceId,
      title: "Main chat",
      x: 100,
      y: 100,
      width: 420,
      height: 520,
      collapsed: false
    }
  });

  await prisma.nodeMessage.create({
    data: {
      workspaceId,
      nodeId: rootNode.id,
      role: "user",
      content: "Explain transformer attention.",
      status: "complete"
    }
  });
  const sourceMessage = await prisma.nodeMessage.create({
    data: {
      workspaceId,
      nodeId: rootNode.id,
      role: "assistant",
      content: "Attention decides which context matters before producing the next token.",
      status: "complete"
    }
  });

  const childNode = await prisma.canvasNode.create({
    data: {
      workspaceId,
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
  await prisma.$disconnect();
});

describe("message command services", () => {
  it("adds hidden source conversation and selected quote context when replying in a follow-up node", async () => {
    await sendUserMessage(
      userId,
      {
        type: "message.sendUserMessage",
        clientMutationId: "mutation-follow-up-message",
        workspaceId,
        nodeId: childNodeId,
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
        workspaceId,
        nodeId: childNodeId,
        role: "user",
        content: "What does context refer to here?",
        status: "complete"
      }
    });
    const childAnswer = await prisma.nodeMessage.create({
      data: {
        workspaceId,
        nodeId: childNodeId,
        role: "assistant",
        content: "Context refers to the earlier tokens and relationships the model can attend to.",
        status: "complete"
      }
    });
    const nestedNode = await prisma.canvasNode.create({
      data: {
        workspaceId,
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
        workspaceId,
        nodeId: nestedNode.id,
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
