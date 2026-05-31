import type { AppConfig } from "@inquara/config";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  listActiveUserSessions,
  revokeAllUserSessions,
  revokeSessionToken,
  verifySessionToken
} from "../auth/session";
import {
  createRegistrationRedemptionCode,
  deleteRegistrationRedemptionCode,
  disableRegistrationRedemptionCode,
  enableRegistrationRedemptionCode,
  listRegistrationRedemptionCodes,
  RedemptionCodeError,
  updateRegistrationRedemptionCodeNote
} from "../redemption-codes/service";
import {
  getInvitationOnlyRegistration,
  setInvitationOnlyRegistration
} from "../settings/service";
import {
  archiveWorkspace,
  AuthError,
  createWorkspace,
  getUser,
  getWorkspaceSnapshot,
  listWorkspaces,
  loginWithPassword,
  renameWorkspace,
  registerWithPassword,
  WorkspaceNotFoundError
} from "../workspaces/service";

const sessionCookieName = "inquara_session";
const rememberedSessionMaxAgeSeconds = 30 * 24 * 60 * 60;

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redemptionCode: z.string().optional().default(""),
  rememberMe: z.boolean().optional().default(false)
});

const LoginSchema = RegisterSchema.extend({
  password: z.string().min(1)
});

const CreateWorkspaceSchema = z.object({
  title: z.string().min(1).max(120)
});

const UpdateWorkspaceSchema = z.object({
  title: z.string().min(1).max(120)
});

const UpdateRegistrationSettingsSchema = z.object({
  invitationOnly: z.boolean()
});

const CreateRedemptionCodeSchema = z.object({
  expiresAt: z.string().datetime().nullable().optional(),
  maxRedemptions: z.number().int().min(1).optional(),
  note: z.string().max(240).nullable().optional(),
  validDays: z.number().int().min(1).optional()
});

const UpdateRedemptionCodeNoteSchema = z.object({
  note: z.string().max(240).nullable()
});

export async function registerRoutes(_app: FastifyInstance, _config?: AppConfig): Promise<void> {
  const app = _app;
  app.get("/healthz", async () => ({ ok: true }));

  app.post("/auth/register", async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    try {
      const { user, session } = await registerWithPassword(body.email, body.password, {
        rememberMe: body.rememberMe,
        redemptionCode: body.redemptionCode,
        ipAddress: request.ip,
        ...(request.headers["user-agent"] !== undefined ? { userAgent: request.headers["user-agent"] } : {})
      });
      setSessionCookie(reply, session, body.rememberMe);
      return user;
    } catch (error) {
      return handleAuthError(error, reply);
    }
  });

  app.get("/auth/registration-settings", async () => {
    return { invitationOnly: await getInvitationOnlyRegistration() };
  });

  app.post("/auth/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    try {
      const { user, session } = await loginWithPassword(body.email, body.password, {
        rememberMe: body.rememberMe,
        ipAddress: request.ip,
        ...(request.headers["user-agent"] !== undefined ? { userAgent: request.headers["user-agent"] } : {})
      });
      setSessionCookie(reply, session, body.rememberMe);
      return user;
    } catch (error) {
      return handleAuthError(error, reply);
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    await revokeSessionToken(request.cookies[sessionCookieName]);
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get("/auth/sessions", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const sessions = await listActiveUserSessions(session.userId);
    return sessions.map(item => ({
      id: item.id,
      rememberMe: item.rememberMe,
      userAgent: item.userAgent,
      ipAddress: item.ipAddress,
      lastSeenAt: item.lastSeenAt.toISOString(),
      expiresAt: item.expiresAt.toISOString(),
      isCurrent: item.id === session.sessionId
    }));
  });

  app.post("/auth/logout-all", async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    await revokeAllUserSessions(session.userId);
    clearSessionCookie(reply);
    return reply.code(204).send();
  });

  app.get("/auth/me", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const user = await getUser(userId);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return user;
  });

  app.get("/admin/codes", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    return listRegistrationRedemptionCodes();
  });

  app.post("/admin/codes", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = CreateRedemptionCodeSchema.parse(request.body ?? {});
    try {
      return await createRegistrationRedemptionCode(admin.userId, {
        expiresAt: resolveExpiresAt(body),
        ...(body.maxRedemptions !== undefined ? { maxRedemptions: body.maxRedemptions } : {}),
        ...(body.note !== undefined ? { note: body.note } : {})
      });
    } catch (error) {
      if (error instanceof RedemptionCodeError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post("/admin/codes/:code/disable", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const params = request.params as { code: string };
    try {
      return await disableRegistrationRedemptionCode(params.code);
    } catch (error) {
      if (error instanceof RedemptionCodeError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.post("/admin/codes/:code/enable", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const params = request.params as { code: string };
    try {
      return await enableRegistrationRedemptionCode(params.code);
    } catch (error) {
      if (error instanceof RedemptionCodeError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.delete("/admin/codes/:code", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const params = request.params as { code: string };
    try {
      await deleteRegistrationRedemptionCode(params.code);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof RedemptionCodeError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  app.patch("/admin/codes/:code/note", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const params = request.params as { code: string };
    const body = UpdateRedemptionCodeNoteSchema.parse(request.body ?? {});
    return updateRegistrationRedemptionCodeNote(params.code, body.note);
  });

  app.get("/admin/settings/registration", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    return { invitationOnly: await getInvitationOnlyRegistration() };
  });

  app.put("/admin/settings/registration", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    const body = UpdateRegistrationSettingsSchema.parse(request.body);
    return setInvitationOnlyRegistration(body.invitationOnly);
  });

  app.get("/workspaces", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    return listWorkspaces(userId);
  });

  app.post("/workspaces", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = CreateWorkspaceSchema.parse(request.body);
    return createWorkspace(userId, body.title);
  });

  app.patch("/workspaces/:workspaceId", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { workspaceId: string };
    const body = UpdateWorkspaceSchema.parse(request.body);

    try {
      return await renameWorkspace(userId, params.workspaceId, body.title);
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({ error: "Workspace not found" });
      }
      throw error;
    }
  });

  app.delete("/workspaces/:workspaceId", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { workspaceId: string };

    try {
      await archiveWorkspace(userId, params.workspaceId);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({ error: "Workspace not found" });
      }
      throw error;
    }
  });

  app.get("/workspaces/:workspaceId/snapshot", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { workspaceId: string };

    try {
      return await getWorkspaceSnapshot(userId, params.workspaceId);
    } catch (error) {
      if (error instanceof WorkspaceNotFoundError) {
        return reply.code(404).send({ error: "Workspace not found" });
      }
      throw error;
    }
  });
}

async function requireUserId(request: FastifyRequest, reply: FastifyReply): Promise<string | null> {
  const session = await requireSession(request, reply);
  return session?.userId ?? null;
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<{ userId: string } | null> {
  const session = await requireSession(request, reply);
  if (!session) return null;
  const user = await getUser(session.userId);
  if (!user || user.role !== "admin") {
    await reply.code(403).send({ error: "Forbidden" });
    return null;
  }
  return { userId: session.userId };
}

async function requireSession(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ userId: string; sessionId: string } | null> {
  const session = await verifySessionToken(request.cookies[sessionCookieName]);
  if (!session) {
    await reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  return session;
}

function setSessionCookie(reply: FastifyReply, session: string, rememberMe: boolean): void {
  const options = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  } as const;

  reply.setCookie(
    sessionCookieName,
    session,
    rememberMe ? { ...options, maxAge: rememberedSessionMaxAgeSeconds } : options
  );
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.setCookie(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

function handleAuthError(error: unknown, reply: FastifyReply) {
  if (error instanceof AuthError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  if (error instanceof RedemptionCodeError) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  throw error;
}

function resolveExpiresAt(body: z.infer<typeof CreateRedemptionCodeSchema>): Date | null {
  if (body.expiresAt) return new Date(body.expiresAt);
  if (body.validDays) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.validDays);
    return expiresAt;
  }
  return null;
}
