import { prisma } from "@inquara/db";
import type { CanvasEdge, CanvasNode, NodeMessage, Workspace, WorkspaceSnapshot } from "@inquara/domain";
import { signSession } from "../auth/session";

const rootAssistantText = "Ask me anything. Select part of an answer to branch into a focused follow-up.";

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
};

export async function loginWithEmail(email: string, secret: string): Promise<{ user: UserDto; session: string }> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: email.split("@")[0] || null }
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    session: signSession(user.id, secret)
  };
}

export async function getUser(userId: string): Promise<UserDto | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? { id: user.id, email: user.email, name: user.name } : null;
}

export async function listWorkspaces(userId: string): Promise<Workspace[]> {
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: userId, archivedAt: null },
    orderBy: { updatedAt: "desc" }
  });

  return workspaces.map(toWorkspace);
}

export async function createWorkspace(userId: string, title: string): Promise<Workspace> {
  const workspace = await prisma.$transaction(async tx => {
    const created = await tx.workspace.create({
      data: { ownerId: userId, title }
    });
    const rootNode = await tx.canvasNode.create({
      data: {
        workspaceId: created.id,
        title: "Main chat",
        x: 120,
        y: 120,
        width: 420,
        height: 520,
        collapsed: false
      }
    });
    await tx.nodeMessage.create({
      data: {
        workspaceId: created.id,
        nodeId: rootNode.id,
        role: "assistant",
        content: rootAssistantText,
        status: "complete"
      }
    });
    return created;
  });

  return toWorkspace(workspace);
}

export async function getWorkspaceSnapshot(userId: string, workspaceId: string): Promise<WorkspaceSnapshot> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId, archivedAt: null },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      edges: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!workspace) {
    throw new WorkspaceNotFoundError(workspaceId);
  }

  return {
    workspace: toWorkspace(workspace),
    nodes: workspace.nodes.map(toCanvasNode),
    edges: workspace.edges.map(toCanvasEdge),
    messages: workspace.messages.map(toNodeMessage)
  };
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace not found: ${workspaceId}`);
    this.name = "WorkspaceNotFoundError";
  }
}

function toWorkspace(value: {
  id: string;
  ownerId: string;
  title: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}): Workspace {
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

function toNodeMessage(value: {
  id: string;
  workspaceId: string;
  nodeId: string;
  role: string;
  content: string;
  status: string;
  model: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NodeMessage {
  return {
    id: value.id,
    workspaceId: value.workspaceId,
    nodeId: value.nodeId,
    role: value.role as NodeMessage["role"],
    content: value.content,
    status: value.status as NodeMessage["status"],
    model: value.model,
    errorMessage: value.errorMessage,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}
