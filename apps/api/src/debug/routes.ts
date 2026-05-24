import type { FastifyInstance } from "fastify";

export async function registerDebugRoutes(app: FastifyInstance): Promise<void> {
  app.get("/debug/health", async () => ({ ok: true, debug: true }));
}
