import { prisma, type PrismaClient } from "@inquara/db";
import type { CanvasEdge, CanvasNode, WorkspaceEvent } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import { createEdgeCreatedEvent, createNodeCreatedEvent, createNodeUpdatedEvent } from "../events/factory";

type Tx = Prisma.TransactionClient;

export type CreateNodeAtPositionCommand = {
  type: "node.createAtPosition";
  clientMutationId: string;
  workspaceId: string;
  title?: string;
  x: number;
  y: number;
};

export type CreateNodeFromSelectionCommand = {
  type: "node.createFromSelection";
  clientMutationId: string;
  workspaceId: string;
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
  workspaceId: string;
  nodeId: string;
  x: number;
  y: number;
};

export type UpdateNodeSizeCommand = {
  type: "node.updateSize";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
  width: number;
  height: number;
};

export type UpdateNodeScrollCommand = {
  type: "node.updateScroll";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
  scrollTop: number;
};

export type RenameNodeCommand = {
  type: "node.rename";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
  title: string;
};

export type HideNodeSubtreeCommand = {
  type: "node.hideSubtree";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
  scrollTop?: number;
};

export type RestoreNodeBranchCommand = {
  type: "node.restoreBranch";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
};

export type DeleteNodeSubtreeCommand = {
  type: "node.deleteSubtree";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
};

export type RestoreDeletedNodeSubtreeCommand = {
  type: "node.restoreDeletedSubtree";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
};

export async function createNodeAtPosition(
  userId: string,
  command: CreateNodeAtPositionCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const node = await tx.canvasNode.create({
      data: {
        workspaceId: command.workspaceId,
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
        workspaceId: command.workspaceId,
        version: workspace.version,
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
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const sourceNode = await tx.canvasNode.findFirst({
      where: { id: command.sourceNodeId, workspaceId: command.workspaceId }
    });
    const sourceMessage = await tx.nodeMessage.findFirst({
      where: { id: command.sourceMessageId, workspaceId: command.workspaceId, nodeId: command.sourceNodeId }
    });
    if (!sourceNode || !sourceMessage) {
      throw new CanvasCommandError("Source node or message was not found.");
    }

    const child = await tx.canvasNode.create({
      data: {
        workspaceId: command.workspaceId,
        title: "Follow-up",
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
        workspaceId: command.workspaceId,
        sourceNodeId: sourceNode.id,
        targetNodeId: child.id,
        sourceMessageId: sourceMessage.id,
        label: command.sourceQuote
      }
    });

    return [
      createNodeCreatedEvent({
        workspaceId: command.workspaceId,
        version: workspace.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(child)
      }),
      createEdgeCreatedEvent({
        workspaceId: command.workspaceId,
        version: workspace.version,
        clientMutationId: command.clientMutationId,
        edge: toCanvasEdge(edge)
      })
    ];
  });
}

export async function updateNodePosition(
  userId: string,
  command: UpdateNodePositionCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const existing = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, workspaceId: command.workspaceId }
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
        workspaceId: command.workspaceId,
        version: workspace.version,
        clientMutationId: command.clientMutationId,
        node: toCanvasNode(node)
      })
    ];
  });
}

export async function updateNodeSize(
  userId: string,
  command: UpdateNodeSizeCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return updateSingleNode(userId, command, { width: command.width, height: command.height }, client);
}

export async function updateNodeScroll(
  userId: string,
  command: UpdateNodeScrollCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return updateSingleNode(userId, command, { scrollTop: command.scrollTop }, client);
}

export async function renameNode(userId: string, command: RenameNodeCommand, client: PrismaClient = prisma): Promise<WorkspaceEvent[]> {
  return updateSingleNode(userId, command, { title: command.title.trim() }, client);
}

export async function hideNodeSubtree(
  userId: string,
  command: HideNodeSubtreeCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const nodes = await tx.canvasNode.findMany({ where: { workspaceId: command.workspaceId, deletedAt: null } });
    const subtreeIds = collectSubtreeIds(nodes, command.nodeId);
    if (subtreeIds.length === 0) throw new CanvasCommandError("Node was not found.");

    const snapshot = Object.fromEntries(
      nodes
        .filter(node => subtreeIds.includes(node.id))
        .map(node => [
          node.id,
          {
            hiddenAt: node.hiddenAt ? node.hiddenAt.toISOString() : null,
            scrollTop: node.id === command.nodeId && command.scrollTop !== undefined ? command.scrollTop : node.scrollTop
          }
        ])
    );
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
        workspaceId: command.workspaceId,
        version: workspace.version,
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
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const node = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, workspaceId: command.workspaceId, deletedAt: null }
    });
    if (!node) throw new CanvasCommandError("Node was not found.");

    const nodes = await tx.canvasNode.findMany({ where: { workspaceId: command.workspaceId, deletedAt: null } });
    const subtreeIds = collectSubtreeIds(nodes, command.nodeId);
    const snapshot = parseHiddenStateSnapshot(node.hiddenStateSnapshot);

    for (const subtreeNodeId of subtreeIds) {
      const saved = snapshot[subtreeNodeId];
      await tx.canvasNode.update({
        where: { id: subtreeNodeId },
        data: {
          hiddenAt: saved?.hiddenAt ? new Date(saved.hiddenAt) : null,
          scrollTop: saved?.scrollTop ?? 0
        }
      });
    }

    const updated = await tx.canvasNode.findMany({
      where: { id: { in: subtreeIds } },
      orderBy: { createdAt: "asc" }
    });
    return updated.map(updatedNode =>
      createNodeUpdatedEvent({
        workspaceId: command.workspaceId,
        version: workspace.version,
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
): Promise<WorkspaceEvent[]> {
  return markDeletedState(userId, command, new Date(), client);
}

export async function restoreDeletedNodeSubtree(
  userId: string,
  command: RestoreDeletedNodeSubtreeCommand,
  client: PrismaClient = prisma
): Promise<WorkspaceEvent[]> {
  return markDeletedState(userId, command, null, client);
}

async function updateSingleNode(
  userId: string,
  command: { clientMutationId: string; workspaceId: string; nodeId: string },
  data: Prisma.CanvasNodeUpdateInput,
  client: PrismaClient
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const existing = await tx.canvasNode.findFirst({
      where: { id: command.nodeId, workspaceId: command.workspaceId, deletedAt: null }
    });
    if (!existing) throw new CanvasCommandError("Node was not found.");

    const node = await tx.canvasNode.update({
      where: { id: command.nodeId },
      data: { ...data, version: { increment: 1 } }
    });

    return [
      createNodeUpdatedEvent({
        workspaceId: command.workspaceId,
        version: workspace.version,
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
): Promise<WorkspaceEvent[]> {
  return client.$transaction(async tx => {
    const workspace = await incrementOwnedWorkspaceVersion(tx, userId, command.workspaceId);
    const nodes = await tx.canvasNode.findMany({ where: { workspaceId: command.workspaceId } });
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
        workspaceId: command.workspaceId,
        version: workspace.version,
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

async function incrementOwnedWorkspaceVersion(tx: Tx, userId: string, workspaceId: string) {
  const workspace = await tx.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId, archivedAt: null }
  });
  if (!workspace) {
    throw new CanvasCommandError("Workspace was not found.");
  }

  return tx.workspace.update({
    where: { id: workspaceId },
    data: { version: { increment: 1 } }
  });
}

function toCanvasNode(value: {
  id: string;
  workspaceId: string;
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
    workspaceId: value.workspaceId,
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
    const scrollTop = typeof entry.scrollTop === "number" && entry.scrollTop >= 0 ? entry.scrollTop : 0;
    snapshot[nodeId] = { hiddenAt, scrollTop };
  }
  return snapshot;
}

function toCanvasEdge(value: {
  id: string;
  workspaceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceMessageId: string | null;
  label: string;
  createdAt: Date;
}): CanvasEdge {
  return {
    id: value.id,
    workspaceId: value.workspaceId,
    sourceNodeId: value.sourceNodeId,
    targetNodeId: value.targetNodeId,
    sourceMessageId: value.sourceMessageId,
    label: value.label,
    createdAt: value.createdAt.toISOString()
  };
}
