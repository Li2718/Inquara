import { prisma } from "@inquara/db";
import type { CanvasEdge, CanvasNode, NodeMessage, Canvas, CanvasSnapshot } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "../auth/password";
import { createUserSession, type CreateSessionOptions } from "../auth/session";
import { redeemRegistrationCodeForUser } from "../redemption-codes/service";
import { getInvitationOnlyRegistration } from "../settings/service";

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

export async function listCanvases(userId: string): Promise<Canvas[]> {
  const canvases = await prisma.canvas.findMany({
    where: { ownerId: userId, archivedAt: null },
    orderBy: { updatedAt: "desc" }
  });

  return canvases.map(toCanvas);
}

export async function createCanvas(userId: string, title: string): Promise<Canvas> {
  const canvas = await prisma.$transaction(async tx => {
    const created = await tx.canvas.create({
      data: { ownerId: userId, title }
    });
    await tx.canvasNode.create({
      data: {
        canvasId: created.id,
        title: "Main chat",
        x: 120,
        y: 120,
        width: 420,
        height: 520,
        collapsed: false
      }
    });
    return created;
  });

  return toCanvas(canvas);
}

export async function renameCanvas(userId: string, canvasId: string, title: string): Promise<Canvas> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId, ownerId: userId, archivedAt: null }
  });
  if (!canvas) {
    throw new CanvasNotFoundError(canvasId);
  }

  const updated = await prisma.canvas.update({
    where: { id: canvasId },
    data: { title }
  });
  return toCanvas(updated);
}

export async function archiveCanvas(userId: string, canvasId: string): Promise<void> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId, ownerId: userId, archivedAt: null }
  });
  if (!canvas) {
    throw new CanvasNotFoundError(canvasId);
  }

  await prisma.canvas.update({
    where: { id: canvasId },
    data: { archivedAt: new Date() }
  });
}

export async function getCanvasSnapshot(userId: string, canvasId: string): Promise<CanvasSnapshot> {
  const canvas = await prisma.canvas.findFirst({
    where: { id: canvasId, ownerId: userId, archivedAt: null },
    include: {
      nodes: { orderBy: { createdAt: "asc" } },
      edges: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!canvas) {
    throw new CanvasNotFoundError(canvasId);
  }

  return {
    canvas: toCanvas(canvas),
    nodes: canvas.nodes.map(toCanvasNode),
    edges: canvas.edges.map(toCanvasEdge),
    messages: canvas.messages.map(toNodeMessage)
  };
}

export class CanvasNotFoundError extends Error {
  constructor(canvasId: string) {
    super(`Canvas not found: ${canvasId}`);
    this.name = "CanvasNotFoundError";
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
    snapshot[nodeId] = {
      hiddenAt: typeof entry.hiddenAt === "string" ? entry.hiddenAt : null,
      offsetX: typeof entry.offsetX === "number" ? entry.offsetX : null,
      offsetY: typeof entry.offsetY === "number" ? entry.offsetY : null,
      scrollTop: typeof entry.scrollTop === "number" && entry.scrollTop >= 0 ? entry.scrollTop : 0
    };
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

function toNodeMessage(value: {
  id: string;
  canvasId: string;
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
    canvasId: value.canvasId,
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
