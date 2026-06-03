import { prisma, type PrismaClient } from "@inquara/db";
import { calculateOrganizedNodePositions, type CanvasEdge, type CanvasNode, type CanvasEvent } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import { createEdgeCreatedEvent, createNodeCreatedEvent, createNodeUpdatedEvent } from "../events/factory";
import { buildHiddenSubtreeSnapshot, resolveRestoredSubtreePositions } from "./hiddenLayout";

type Tx = Prisma.TransactionClient;

export type CreateNodeAtPositionCommand = {
  type: "node.createAtPosition";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  title?: string;
  x: number;
  y: number;
};

export type CreateNodeFromSelectionCommand = {
  type: "node.createFromSelection";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  edgeId: string;
  sourceNodeId: string;
  sourceMessageId: string;
  sourceQuote: string;
  sourceRangeStart: number;
  sourceRangeEnd: number;
  x: number;
  y: number;
};

export type UpdateNodePositionCommand = {
  type: "node.updatePosition";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  x: number;
  y: number;
};

export type OrganizeCanvasNodesCommand = {
  type: "node.organize";
  clientMutationId: string;
  canvasId: string;
};

export type UpdateNodeSizeCommand = {
  type: "node.updateSize";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  width: number;
  height: number;
};

export type UpdateNodeScrollCommand = {
  type: "node.updateScroll";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  scrollTop: number;
};

export type RenameNodeCommand = {
  type: "node.rename";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  title: string;
};

export type HideNodeSubtreeCommand = {
  type: "node.hideSubtree";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  scrollTop?: number;
};

export type RestoreNodeBranchCommand = {
  type: "node.restoreBranch";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  x?: number;
  y?: number;
};

export type DeleteNodeSubtreeCommand = {
  type: "node.deleteSubtree";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
};

export type RestoreDeletedNodeSubtreeCommand = {
  type: "node.restoreDeletedSubtree";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
};

export async function createNodeAtPosition(
  userId: string,
  command: CreateNodeAtPositionCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const node = await tx.canvasNode.create({
      data: {
        id: command.nodeId,
        canvasId: command.canvasId,
        title: command.title || "New chat",
        x: command.x,
        y: command.y,
        width: 420,
        height: 520,
        collapsed: false
      }
    });

    return [
      createNodeCreatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    ];
  });
}

export async function createNodeFromSelection(
  userId: string,
  command: CreateNodeFromSelectionCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const sourceNode = await tx.canvasNode.findFirst({
      where: { id: command.sourceNodeId, canvasId: command.canvasId }
    });
    const sourceMessage = await tx.nodeMessage.findFirst({
      where: { id: command.sourceMessageId, canvasId: command.canvasId, nodeId: command.sourceNodeId }
    });
    if (!sourceNode || !sourceMessage) {
      throw new CanvasCommandError("Source node or message was not found.");
    }

    const child = await tx.canvasNode.create({
      data: {
        id: command.nodeId,
        canvasId: command.canvasId,
        title: truncateTitle(command.sourceQuote),
        x: command.x,
        y: command.y,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: sourceNode.id,
        sourceNodeId: sourceNode.id,
        sourceMessageId: sourceMessage.id,
        sourceQuote: command.sourceQuote,
        sourceRangeStart: command.sourceRangeStart,
        sourceRangeEnd: command.sourceRangeEnd
      }
    });

    const edge = await tx.canvasEdge.create({
      data: {
        id: command.edgeId,
        canvasId: command.canvasId,
        sourceNodeId: sourceNode.id,
        targetNodeId: child.id,
        sourceMessageId: sourceMessage.id,
        label: command.sourceQuote
      }
    });

    return [
      createNodeCreatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(child)
      }),
      createEdgeCreatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        edge: toCanvasEdge(edge)
      })
    ];
  });
}

function truncateTitle(value: string, maxLength = 80): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized || "Follow-up";
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export async function updateNodePosition(
  userId: string,
  command: UpdateNodePositionCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const existing = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, canvasId: command.canvasId }
    });
    if (!existing) {
      throw new CanvasCommandError("Node was not found.");
    }

    const node = await tx.canvasNode.update({
      where: { id: command.nodeId },
      data: { x: command.x, y: command.y, version: { increment: 1 } }
    });

    return [
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    ];
  });
}

export async function organizeCanvasNodes(
  userId: string,
  command: OrganizeCanvasNodesCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const nodes = await tx.canvasNode.findMany({
      where: { canvasId: command.canvasId, deletedAt: null },
      orderBy: { createdAt: "asc" }
    });
    const nodeDtos = nodes.map(toCanvasNode);
    const positions = calculateOrganizedNodePositions(nodeDtos);
    const updatedNodes: CanvasNode[] = [];

    for (const node of nodes) {
      const nextPosition = positions.get(node.id);
      if (!nextPosition) continue;
      if (node.x === nextPosition.x && node.y === nextPosition.y) {
        updatedNodes.push(toCanvasNode(node));
        continue;
      }
      const updated = await tx.canvasNode.update({
        where: { id: node.id },
        data: { x: nextPosition.x, y: nextPosition.y, version: { increment: 1 } }
      });
      updatedNodes.push(toCanvasNode(updated));
    }

    return updatedNodes.map(node =>
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node
      })
    );
  });
}

export async function updateNodeSize(
  userId: string,
  command: UpdateNodeSizeCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return updateSingleNode(userId, command, { width: command.width, height: command.height }, client);
}

export async function updateNodeScroll(
  userId: string,
  command: UpdateNodeScrollCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return updateSingleNode(userId, command, { scrollTop: command.scrollTop }, client);
}

export async function renameNode(userId: string, command: RenameNodeCommand, client: PrismaClient = prisma): Promise<CanvasEvent[]> {
  return updateSingleNode(userId, command, { title: command.title.trim() }, client);
}

export async function hideNodeSubtree(
  userId: string,
  command: HideNodeSubtreeCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const nodes = await tx.canvasNode.findMany({ where: { canvasId: command.canvasId, deletedAt: null } });
    const subtreeIds = collectSubtreeIds(nodes, command.nodeId);
    if (subtreeIds.length === 0) throw new CanvasCommandError("Node was not found.");

    const snapshot = buildHiddenSubtreeSnapshot(nodes.map(toCanvasNode), command.nodeId, command.scrollTop);
    const now = new Date();

    await tx.canvasNode.updateMany({
      where: { id: { in: subtreeIds } },
      data: { hiddenAt: now }
    });
    await tx.canvasNode.update({
      where: { id: command.nodeId },
      data: {
        hiddenStateSnapshot: snapshot,
        ...(command.scrollTop !== undefined ? { scrollTop: command.scrollTop } : {})
      }
    });

    const updated = await tx.canvasNode.findMany({
      where: { id: { in: subtreeIds } },
      orderBy: { createdAt: "asc" }
    });
    return updated.map(node =>
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    );
  });
}

export async function restoreNodeBranch(
  userId: string,
  command: RestoreNodeBranchCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const node = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, canvasId: command.canvasId, deletedAt: null }
    });
    if (!node) throw new CanvasCommandError("Node was not found.");

    const nodes = await tx.canvasNode.findMany({ where: { canvasId: command.canvasId, deletedAt: null } });
    const subtreeIds = collectSubtreeIds(nodes, command.nodeId);
    const snapshot = parseHiddenStateSnapshot(node.hiddenStateSnapshot) ?? {};
    const positions = resolveRestoredSubtreePositions(
      nodes.map(toCanvasNode),
      command.nodeId,
      snapshot,
      command.x !== undefined && command.y !== undefined ? { x: command.x, y: command.y } : undefined
    );

    for (const subtreeNodeId of subtreeIds) {
      const saved = snapshot[subtreeNodeId];
      const nextPosition = positions.get(subtreeNodeId);
      await tx.canvasNode.update({
        where: { id: subtreeNodeId },
        data: {
          hiddenAt: subtreeNodeId === command.nodeId ? null : saved?.hiddenAt ? new Date(saved.hiddenAt) : null,
          scrollTop: saved?.scrollTop ?? 0,
          ...(nextPosition ? { x: nextPosition.x, y: nextPosition.y } : {})
        }
      });
    }

    const updated = await tx.canvasNode.findMany({
      where: { id: { in: subtreeIds } },
      orderBy: { createdAt: "asc" }
    });
    return updated.map(updatedNode =>
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(updatedNode)
      })
    );
  });
}

export async function deleteNodeSubtree(
  userId: string,
  command: DeleteNodeSubtreeCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return markDeletedState(userId, command, new Date(), client);
}

export async function restoreDeletedNodeSubtree(
  userId: string,
  command: RestoreDeletedNodeSubtreeCommand,
  client: PrismaClient = prisma
): Promise<CanvasEvent[]> {
  return markDeletedState(userId, command, null, client);
}

async function updateSingleNode(
  userId: string,
  command: { clientMutationId: string; canvasId: string; nodeId: string },
  data: Prisma.CanvasNodeUpdateInput,
  client: PrismaClient
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const existing = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, canvasId: command.canvasId, deletedAt: null }
    });
    if (!existing) throw new CanvasCommandError("Node was not found.");

    const node = await tx.canvasNode.update({
      where: { id: command.nodeId },
      data: { ...data, version: { increment: 1 } }
    });

    return [
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    ];
  });
}

async function markDeletedState(
  userId: string,
  command: DeleteNodeSubtreeCommand | RestoreDeletedNodeSubtreeCommand,
  deletedAt: Date | null,
  client: PrismaClient
): Promise<CanvasEvent[]> {
  return client.$transaction(async tx => {
    const canvas = await incrementOwnedCanvasVersion(tx, userId, command.canvasId);
    const nodes = await tx.canvasNode.findMany({ where: { canvasId: command.canvasId } });
    const subtreeIds = collectSubtreeIds(nodes, command.nodeId);
    if (subtreeIds.length === 0) throw new CanvasCommandError("Node was not found.");

    await tx.canvasNode.updateMany({
      where: { id: { in: subtreeIds } },
      data: deletedAt ? { deletedAt, hiddenAt: deletedAt } : { deletedAt: null, hiddenAt: null }
    });
    const updated = await tx.canvasNode.findMany({
      where: { id: { in: subtreeIds } },
      orderBy: { createdAt: "asc" }
    });
    return updated.map(node =>
      createNodeUpdatedEvent({
        canvasId: command.canvasId,
        version: canvas.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    );
  });
}

export class CanvasCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanvasCommandError";
  }
}

async function incrementOwnedCanvasVersion(tx: Tx, userId: string, canvasId: string) {
  const canvas = await tx.canvas.findFirst({
    where: { id: canvasId, ownerId: userId, archivedAt: null }
  });
  if (!canvas) {
    throw new CanvasCommandError("Canvas was not found.");
  }

  return tx.canvas.update({
    where: { id: canvasId },
    data: { version: { increment: 1 } }
  });
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

function collectSubtreeIds(nodes: Array<{ id: string; parentNodeId: string | null }>, rootNodeId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentNodeId) continue;
    childrenByParent.set(node.parentNodeId, [...(childrenByParent.get(node.parentNodeId) ?? []), node.id]);
  }

  const ids: string[] = [];
  const stack = nodes.some(node => node.id === rootNodeId) ? [rootNodeId] : [];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return ids;
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

function toCanvasEdge(value: {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceMessageId: string | null;
  label: string;
  createdAt: Date;
}): CanvasEdge {
  return {
    id: value.id,
    canvasId: value.canvasId,
    sourceNodeId: value.sourceNodeId,
    targetNodeId: value.targetNodeId,
    sourceMessageId: value.sourceMessageId,
    label: value.label,
    createdAt: value.createdAt.toISOString()
  };
}
