import type { Canvas, CanvasEvent, CanvasNode } from "@inquara/domain";
import type { PrismaClient } from "@inquara/db";
import type { Prisma } from "@prisma/client";
import type { AIProvider, ChatContextMessage } from "../ai/provider";
import { createCanvasUpdatedEvent, createNodeUpdatedEvent } from "../events/factory";

type Tx = Prisma.TransactionClient;

export type InitialTitleRequest = {
  canvasId: string;
  fallbackTitle: string;
  messages: ChatContextMessage[];
  nodeId: string;
  updateCanvas: boolean;
};

export async function createInitialTitleFallback({
  canvasId,
  clientMutationId,
  content,
  tx,
  userId,
  nodeId
}: {
  canvasId: string;
  clientMutationId: string;
  content: string;
  tx: Tx;
  userId: string;
  nodeId: string;
}): Promise<{ events: CanvasEvent[]; titleRequest: InitialTitleRequest | null }> {
  const node = await tx.canvasNode.findFirst({
    where: {
      id: nodeId,
      canvasId,
      canvas: { ownerId: userId, archivedAt: null }
    }
  });
  if (!node) return { events: [], titleRequest: null };

  const existingUserMessageCount = await tx.nodeMessage.count({
    where: {
      canvasId,
      nodeId,
      role: "user"
    }
  });
  if (existingUserMessageCount !== 0) return { events: [], titleRequest: null };

  const titlePlan = await buildInitialTitlePlan(tx, node, content);
  if (!titlePlan) return { events: [], titleRequest: null };

  const fallbackTitle = truncateTitle(titlePlan.fallbackTitle);
  const events = await applyTitle(tx, { canvasId, clientMutationId, nodeId, title: fallbackTitle, updateCanvas: titlePlan.updateCanvas });
  return {
    events,
    titleRequest: {
      canvasId,
      fallbackTitle,
      messages: titlePlan.messages,
      nodeId,
      updateCanvas: titlePlan.updateCanvas
    }
  };
}

export async function createGeneratedTitleEvents({
  client,
  provider,
  request
}: {
  client: PrismaClient;
  provider: AIProvider;
  request: InitialTitleRequest;
}): Promise<CanvasEvent[]> {
  const generatedTitle = await generateTitle(provider, request).catch(() => null);
  const normalizedGeneratedTitle = generatedTitle ? truncateTitle(generatedTitle) : null;
  if (!normalizedGeneratedTitle || normalizedGeneratedTitle === request.fallbackTitle) return [];

  return client.$transaction(tx =>
    applyTitle(tx, {
      canvasId: request.canvasId,
      clientMutationId: null,
      nodeId: request.nodeId,
      title: normalizedGeneratedTitle,
      updateCanvas: request.updateCanvas
    })
  );
}

async function buildInitialTitlePlan(
  tx: Tx,
  node: { canvasId: string; createdAt: Date; id: string; parentNodeId: string | null; sourceQuote: string | null },
  question: string
): Promise<
  | {
      fallbackTitle: string;
      messages: ChatContextMessage[];
      updateCanvas: boolean;
    }
  | null
> {
  if (node.parentNodeId || node.sourceQuote) {
    const selectedText = node.sourceQuote?.trim();
    if (!selectedText) return null;
    return {
      fallbackTitle: selectedText,
      updateCanvas: false,
      messages: titlePrompt([
        "Generate a concise descriptive title for a follow-up chat.",
        `Selected text: ${selectedText}`,
        `First question: ${question}`
      ])
    };
  }

  const rootNode = await tx.canvasNode.findFirst({
    where: {
      canvasId: node.canvasId,
      parentNodeId: null,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" }
  });

  return {
    fallbackTitle: question,
    updateCanvas: rootNode?.id === node.id,
    messages: titlePrompt([
      "Generate a concise descriptive title for a chat.",
      `First question: ${question}`
    ])
  };
}

function titlePrompt(lines: string[]): ChatContextMessage[] {
  return [
    {
      role: "system",
      content: [
        "You write short chat titles for a canvas app.",
        "Return only the title.",
        "Use the same language as the user's question when possible.",
        "Keep it under 8 words."
      ].join("\n")
    },
    {
      role: "user",
      content: lines.join("\n")
    }
  ];
}

async function generateTitle(provider: AIProvider, plan: { messages: ChatContextMessage[] }): Promise<string | null> {
  const result = await provider.completeSmallTask(plan.messages);
  const title = sanitizeTitle(result.content);
  return title || null;
}

async function applyTitle(
  tx: Tx,
  input: {
    canvasId: string;
    clientMutationId: string | null;
    nodeId: string;
    title: string;
    updateCanvas: boolean;
  }
): Promise<CanvasEvent[]> {
  const events: CanvasEvent[] = [];
  const nodeVersion = await incrementCanvasVersion(tx, input.canvasId);
  const node = await tx.canvasNode.update({
    where: { id: input.nodeId },
    data: {
      title: input.title,
      version: { increment: 1 }
    }
  });
  events.push(
    createNodeUpdatedEvent({
      canvasId: input.canvasId,
      version: nodeVersion,
      clientMutationId: input.clientMutationId,
      node: toCanvasNode(node)
    })
  );

  if (input.updateCanvas) {
    const canvasVersion = await incrementCanvasVersion(tx, input.canvasId);
    const canvas = await tx.canvas.update({
      where: { id: input.canvasId },
      data: { title: input.title }
    });
    events.push(
      createCanvasUpdatedEvent({
        canvasId: input.canvasId,
        version: canvasVersion,
        clientMutationId: null,
        canvas: toCanvas(canvas)
      })
    );
  }

  return events;
}

async function incrementCanvasVersion(tx: Tx, canvasId: string): Promise<number> {
  const canvas = await tx.canvas.update({
    where: { id: canvasId },
    data: { version: { increment: 1 } }
  });
  return canvas.version;
}

function sanitizeTitle(value: string): string {
  return value
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

export function truncateTitle(value: string, maxLength = 80): string {
  const normalized = sanitizeTitle(value);
  if (normalized.length <= maxLength) return normalized || "New chat";
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function toCanvas(value: {
  id: string;
  ownerId: string;
  title: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): Canvas {
  return {
    id: value.id,
    ownerId: value.ownerId,
    title: value.title,
    version: value.version,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

function toCanvasNode(value: {
  id: string;
  canvasId: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  hiddenAt: Date | null;
  deletedAt: Date | null;
  scrollTop: number;
  hiddenStateSnapshot: Prisma.JsonValue | null;
  parentNodeId: string | null;
  sourceNodeId: string | null;
  sourceMessageId: string | null;
  sourceQuote: string | null;
  sourceRangeStart: number | null;
  sourceRangeEnd: number | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): CanvasNode {
  return {
    id: value.id,
    canvasId: value.canvasId,
    title: value.title,
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    collapsed: value.collapsed,
    hiddenAt: value.hiddenAt?.toISOString() ?? null,
    deletedAt: value.deletedAt?.toISOString() ?? null,
    scrollTop: value.scrollTop,
    hiddenStateSnapshot: parseHiddenStateSnapshot(value.hiddenStateSnapshot),
    parentNodeId: value.parentNodeId,
    sourceNodeId: value.sourceNodeId,
    sourceMessageId: value.sourceMessageId,
    sourceQuote: value.sourceQuote,
    sourceRangeStart: value.sourceRangeStart,
    sourceRangeEnd: value.sourceRangeEnd,
    version: value.version,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

function parseHiddenStateSnapshot(value: Prisma.JsonValue | null): CanvasNode["hiddenStateSnapshot"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot: NonNullable<CanvasNode["hiddenStateSnapshot"]> = {};
  for (const [nodeId, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const hiddenAt = typeof entry.hiddenAt === "string" ? entry.hiddenAt : null;
    const offsetX = typeof entry.offsetX === "number" ? entry.offsetX : null;
    const offsetY = typeof entry.offsetY === "number" ? entry.offsetY : null;
    const scrollTop = typeof entry.scrollTop === "number" && entry.scrollTop >= 0 ? entry.scrollTop : 0;
    snapshot[nodeId] = { hiddenAt, offsetX, offsetY, scrollTop };
  }
  return snapshot;
}
