import type { AppConfig } from "@inquara/config";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { verifySession } from "../auth/session";
import {
  createWorkspace,
  getUser,
  getWorkspaceSnapshot,
  listWorkspaces,
  loginWithEmail,
  WorkspaceNotFoundError
} from "../workspaces/service";

const sessionCookieName = "inquara_session";

const LoginSchema = z.object({
  email: z.string().email()
});

const CreateWorkspaceSchema = z.object({
  title: z.string().min(1).max(120)
});

export async function registerRoutes(app: FastifyInstance, config: AppConfig): Promise<void> {
  app.get("/healthz", async () => ({ ok: true }));

  app.post("/auth/login", async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const { user, session } = await loginWithEmail(body.email, config.SESSION_SECRET);

    reply.setCookie(sessionCookieName, session, {
      httpOnly: true,
      sameSite: "lax",
      path: "/"
    });

    return user;
  });

  app.get("/auth/me", async (request, reply) => {
    const userId = await requireUserId(request, reply, config);
    if (!userId) return;
    const user = await getUser(userId);
    if (!user) return reply.code(401).send({ error: "Unauthorized" });
    return user;
  });

  app.get("/workspaces", async (request, reply) => {
    const userId = await requireUserId(request, reply, config);
    if (!userId) return;
    return listWorkspaces(userId);
  });

  app.post("/workspaces", async (request, reply) => {
    const userId = await requireUserId(request, reply, config);
    if (!userId) return;
    const body = CreateWorkspaceSchema.parse(request.body);
    return createWorkspace(userId, body.title);
  });

  app.get("/workspaces/:workspaceId/snapshot", async (request, reply) => {
    const userId = await requireUserId(request, reply, config);
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

async function requireUserId(
  request: FastifyRequest,
  reply: FastifyReply,
  config: AppConfig
): Promise<string | null> {
  const userId = verifySession(request.cookies[sessionCookieName], config.SESSION_SECRET);
  if (!userId) {
    await reply.code(401).send({ error: "Unauthorized" });
    return null;
  }
  return userId;
}
