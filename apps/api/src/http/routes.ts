import type { AppConfig } from "@inquara/config";
import { CanvasCommandSchema, type CanvasCommand } from "@inquara/domain";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createAIProvider } from "../ai/factory";
import { listAdminUsers } from "../admin-users/service";
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
  archiveCanvas,
  AuthError,
  createCanvas,
  getUser,
  getCanvasSnapshot,
  listCanvases,
  loginWithPassword,
  renameCanvas,
  registerWithPassword,
  CanvasNotFoundError
} from "../canvases/service";
import { CanvasCommandError } from "../canvas/service";
import { InMemoryCanvasLeaseStore, type CanvasLeaseStore } from "../leases/service";
import { MessageCommandError, MessageStreamingInterruptedError } from "../messages/service";
import {
  dispatchCanvasCommand,
  streamCanvasMessageCommand,
  UnsupportedCanvasCommandError
} from "../canvas-commands/service";

const sessionCookieName = "inquara_session";
const rememberedSessionMaxAgeSeconds = 30 * 24 * 60 * 60;
const canvasLeaseTtlSeconds = 15;
const slowNewCanvasMockDelayMs = parseDevelopmentDelay(process.env.INQUARA_SLOW_NEW_CANVAS_MS);

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  redemptionCode: z.string().optional().default(""),
  rememberMe: z.boolean().optional().default(false)
});

const LoginSchema = RegisterSchema.extend({
  password: z.string().min(1)
});

const CreateCanvasSchema = z.object({
  title: z.string().min(1).max(120)
});

const UpdateCanvasSchema = z.object({
  title: z.string().min(1).max(120)
});

const UpdateRegistrationSettingsSchema = z.object({
  invitationOnly: z.boolean()
});

const LeaseMutationSchema = z.object({
  sessionId: z.string().min(1)
});

const RenewLeaseSchema = LeaseMutationSchema.extend({
  leaseEpoch: z.number().int().positive()
});

const CommandEnvelopeSchema = z.object({
  sessionId: z.string().min(1),
  leaseEpoch: z.number().int().positive(),
  command: z.unknown()
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

export async function registerRoutes(
  _app: FastifyInstance,
  _config?: AppConfig,
  leaseStore: CanvasLeaseStore = new InMemoryCanvasLeaseStore()
): Promise<void> {
  const app = _app;
  const config = _config;
  const aiProvider = config ? createAIProvider(config) : null;
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

  app.get("/admin/users", async (request, reply) => {
    const admin = await requireAdmin(request, reply);
    if (!admin) return;
    return listAdminUsers();
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

  app.get("/canvases", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    return listCanvases(userId);
  });

  app.post("/canvases", async (request, reply) => {
    await waitForSlowNewCanvasMock();
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const body = CreateCanvasSchema.parse(request.body);
    return createCanvas(userId, body.title);
  });

  app.patch("/canvases/:canvasId", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const body = UpdateCanvasSchema.parse(request.body);

    try {
      return await renameCanvas(userId, params.canvasId, body.title);
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.delete("/canvases/:canvasId", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };

    try {
      await archiveCanvas(userId, params.canvasId);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.get("/canvases/:canvasId/snapshot", async (request, reply) => {
    await waitForSlowNewCanvasMock();
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };

    try {
      return await getCanvasSnapshot(userId, params.canvasId);
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.post("/canvases/:canvasId/lease/acquire", async (request, reply) => {
    await waitForSlowNewCanvasMock();
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const body = LeaseMutationSchema.parse(request.body ?? {});

    try {
      await getCanvasSnapshot(userId, params.canvasId);
      return leaseStore.acquire({
        canvasId: params.canvasId,
        sessionId: body.sessionId,
        ttlSeconds: canvasLeaseTtlSeconds,
        now: new Date()
      });
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.post("/canvases/:canvasId/lease/renew", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const body = RenewLeaseSchema.parse(request.body ?? {});

    try {
      await getCanvasSnapshot(userId, params.canvasId);
      const result = await leaseStore.renew({
        canvasId: params.canvasId,
        sessionId: body.sessionId,
        leaseEpoch: body.leaseEpoch,
        ttlSeconds: canvasLeaseTtlSeconds,
        now: new Date()
      });
      if (result.status === "stale") {
        return reply.code(409).send({ error: "Canvas lease is stale." });
      }
      return result;
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.post("/canvases/:canvasId/lease/release", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const body = LeaseMutationSchema.parse(request.body ?? {});

    try {
      await getCanvasSnapshot(userId, params.canvasId);
      await leaseStore.release({
        canvasId: params.canvasId,
        sessionId: body.sessionId
      });
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.get("/canvases/:canvasId/lease/status", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const query = LeaseMutationSchema.parse(request.query ?? {});

    try {
      await getCanvasSnapshot(userId, params.canvasId);
      return leaseStore.getStatus({
        canvasId: params.canvasId,
        sessionId: query.sessionId,
        now: new Date()
      });
    } catch (error) {
      if (error instanceof CanvasNotFoundError) {
        return reply.code(404).send({ error: "Canvas not found" });
      }
      throw error;
    }
  });

  app.post("/canvases/:canvasId/commands", async (request, reply) => {
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    const params = request.params as { canvasId: string };
    const body = parseCommandEnvelope(request.body);

    try {
      if (body.command.canvasId !== params.canvasId) {
        return reply.code(400).send({ error: "Canvas command target does not match the route." });
      }
      await assertCanvasLease(leaseStore, {
        canvasId: params.canvasId,
        sessionId: body.sessionId,
        leaseEpoch: body.leaseEpoch
      });
      const events = await dispatchCanvasCommand(userId, body.command);
      return { events };
    } catch (error) {
      return handleCanvasCommandError(error, reply);
    }
  });

  app.post("/canvases/:canvasId/messages/stream", async (request, reply) => {
    await waitForSlowNewCanvasMock();
    const userId = await requireUserId(request, reply);
    if (!userId) return;
    if (!aiProvider) {
      return reply.code(500).send({ error: "AI provider is unavailable." });
    }
    const params = request.params as { canvasId: string };
    const body = parseCommandEnvelope(request.body);

    if (body.command.type !== "message.sendUserMessage") {
      return reply.code(400).send({ error: "Expected a message.sendUserMessage command." });
    }
    if (body.command.canvasId !== params.canvasId) {
      return reply.code(400).send({ error: "Canvas command target does not match the route." });
    }

    let streamStarted = false;
    try {
      await assertCanvasLease(leaseStore, {
        canvasId: params.canvasId,
        sessionId: body.sessionId,
        leaseEpoch: body.leaseEpoch
      });
      reply.hijack();
      const corsOrigin = config?.WEB_ORIGIN ?? request.headers.origin ?? "*";
      reply.raw.writeHead(200, {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Origin": corsOrigin,
        "Cache-Control": "no-store",
        "Content-Type": "application/x-ndjson; charset=utf-8"
      });
      streamStarted = true;
      await streamCanvasMessageCommand(
        userId,
        body.command,
        aiProvider,
        async event => {
          reply.raw.write(`${JSON.stringify({ type: "event", event })}\n`);
        },
        async () => {
          await assertCanvasLease(leaseStore, {
            canvasId: params.canvasId,
            sessionId: body.sessionId,
            leaseEpoch: body.leaseEpoch
          });
        }
      );
      reply.raw.end();
      return;
    } catch (error) {
      if (streamStarted) {
        reply.raw.write(
          `${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Stream failed." })}\n`
        );
        reply.raw.end();
        return;
      }
      return handleCanvasCommandError(error, reply);
    }
  });
}

function parseDevelopmentDelay(value: string | undefined): number {
  if (process.env.NODE_ENV === "production") return 0;
  const delayMs = Number(value);
  if (!Number.isFinite(delayMs) || delayMs <= 0) return 0;
  return Math.min(Math.round(delayMs), 10_000);
}

async function waitForSlowNewCanvasMock(): Promise<void> {
  if (slowNewCanvasMockDelayMs <= 0) return;
  await new Promise(resolve => {
    setTimeout(resolve, slowNewCanvasMockDelayMs);
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

function parseCommandEnvelope(body: unknown): z.infer<typeof CommandEnvelopeSchema> & { command: CanvasCommand } {
  const parsed = CommandEnvelopeSchema.parse(body ?? {});
  return {
    ...parsed,
    command: CanvasCommandSchema.parse(parsed.command)
  };
}

async function assertCanvasLease(
  leaseStore: CanvasLeaseStore,
  input: {
    canvasId: string;
    sessionId: string;
    leaseEpoch: number;
  }
): Promise<void> {
  const renewed = await leaseStore.renew({
    canvasId: input.canvasId,
    sessionId: input.sessionId,
    leaseEpoch: input.leaseEpoch,
    ttlSeconds: canvasLeaseTtlSeconds,
    now: new Date()
  });
  if (renewed.status === "stale") {
    throw new MessageStreamingInterruptedError("Canvas lease is stale.");
  }
}

function handleCanvasCommandError(error: unknown, reply: FastifyReply) {
  if (error instanceof CanvasNotFoundError) {
    return reply.code(404).send({ error: "Canvas not found" });
  }
  if (error instanceof CanvasCommandError || error instanceof MessageCommandError) {
    return reply.code(400).send({ error: error.message });
  }
  if (error instanceof UnsupportedCanvasCommandError) {
    return reply.code(400).send({ error: error.message });
  }
  if (error instanceof MessageStreamingInterruptedError) {
    return reply.code(409).send({ error: error.message });
  }
  throw error;
}
