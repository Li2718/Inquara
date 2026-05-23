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
