import { prisma } from "@inquara/db";
import type { UserSession } from "@prisma/client";
import crypto from "node:crypto";

const tokenBytes = 32;
const regularSessionDays = 7;
const rememberedSessionDays = 30;

export type SessionContext = {
  userId: string;
  sessionId: string;
};

export type CreateSessionOptions = {
  rememberMe?: boolean;
  userAgent?: string;
  ipAddress?: string;
};

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("base64url");
}

export async function createUserSession(userId: string, options: CreateSessionOptions = {}): Promise<{ token: string; session: UserSession }> {
  const token = crypto.randomBytes(tokenBytes).toString("base64url");
  const rememberMe = options.rememberMe ?? false;
  const expiresAt = new Date(Date.now() + (rememberMe ? rememberedSessionDays : regularSessionDays) * 24 * 60 * 60 * 1000);
  const session = await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      rememberMe,
      expiresAt,
      ...(options.userAgent !== undefined ? { userAgent: options.userAgent } : {}),
      ...(options.ipAddress !== undefined ? { ipAddress: options.ipAddress } : {})
    }
  });

  return { token, session };
}

export async function verifySessionToken(token: string | undefined): Promise<SessionContext | null> {
  if (!token) return null;
  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) }
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null;

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() }
  });

  return { userId: session.userId, sessionId: session.id };
}

export async function revokeSessionToken(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.userSession.updateMany({
    where: {
      tokenHash: hashToken(token),
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null
    },
    data: { revokedAt: new Date() }
  });
}

export async function listActiveUserSessions(userId: string): Promise<UserSession[]> {
  return prisma.userSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() }
    },
    orderBy: { lastSeenAt: "desc" }
  });
}
