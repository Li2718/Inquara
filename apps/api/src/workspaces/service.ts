import { prisma } from "@inquara/db";
import type { CanvasEdge, CanvasNode, NodeMessage, Workspace, WorkspaceSnapshot } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "../auth/password";
import { createUserSession, type CreateSessionOptions } from "../auth/session";
import { redeemRegistrationCodeForUser } from "../redemption-codes/service";
import { getInvitationOnlyRegistration } from "../settings/service";

const rootAssistantText = "Ask me anything. Select part of an answer to branch into a focused follow-up.";

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export type AuthResult = {
  user: UserDto;
  session: string;
};

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function registerWithPassword(
  email: string,
  password: string,
  options: CreateSessionOptions & { redemptionCode?: string } = {}
): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await hashPassword(password);
  const user = await prisma.$transaction(async tx => {
    const invitationOnly = await getInvitationOnlyRegistration(tx);
    const redemptionCode = options.redemptionCode?.trim() ?? "";
    if (invitationOnly && !redemptionCode) {
      throw new AuthError("Invitation code is unavailable or expired.", 403);
    }

    const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
    if (existing?.passwordHash) {
      throw new AuthError("Account already has a password.", 409);
    }

    const saved = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            passwordHash,
            identities: {
              upsert: {
                where: { provider_providerUserId: { provider: "password", providerUserId: normalizedEmail } },
                update: { email: normalizedEmail },
                create: { provider: "password", providerUserId: normalizedEmail, email: normalizedEmail }
              }
            }
          }
        })
      : await tx.user.create({
          data: {
            email: normalizedEmail,
            name: normalizedEmail.split("@")[0] || null,
            passwordHash,
            identities: {
              create: { provider: "password", providerUserId: normalizedEmail, email: normalizedEmail }
            }
          }
        });

    if (redemptionCode) {
      await redeemRegistrationCodeForUser(tx, redemptionCode, saved.id);
    }

    return saved;
  });

  const { token } = await createUserSession(user.id, options);
  return {
    user: toUserDto(user),
    session: token
  };
}

export async function loginWithPassword(email: string, password: string, options: CreateSessionOptions = {}): Promise<AuthResult> {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !passwordMatches) {
    throw new AuthError("Invalid email or password.", 401);
  }

  const { token } = await createUserSession(user.id, options);
  return {
    user: toUserDto(user),
    session: token
  };
}

export async function getUser(userId: string): Promise<UserDto | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ? toUserDto(user) : null;
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

export async function renameWorkspace(userId: string, workspaceId: string, title: string): Promise<Workspace> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId, archivedAt: null }
  });
  if (!workspace) {
    throw new WorkspaceNotFoundError(workspaceId);
  }

  const updated = await prisma.workspace.update({
    where: { id: workspaceId },
    data: { title }
  });
  return toWorkspace(updated);
}

export async function archiveWorkspace(userId: string, workspaceId: string): Promise<void> {
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, ownerId: userId, archivedAt: null }
  });
  if (!workspace) {
    throw new WorkspaceNotFoundError(workspaceId);
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { archivedAt: new Date() }
  });
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserDto(user: { id: string; email: string; name: string | null; role: string }): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
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

function parseHiddenStateSnapshot(value: Prisma.JsonValue | null): CanvasNode["hiddenStateSnapshot"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot: NonNullable<CanvasNode["hiddenStateSnapshot"]> = {};
  for (const [nodeId, entry] of Object.entries(value)) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    snapshot[nodeId] = {
      hiddenAt: typeof entry.hiddenAt === "string" ? entry.hiddenAt : null,
      scrollTop: typeof entry.scrollTop === "number" && entry.scrollTop >= 0 ? entry.scrollTop : 0
    };
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
