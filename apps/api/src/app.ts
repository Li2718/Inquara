import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { loadConfig, type AppConfig } from "@inquara/config";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerDebugRoutes } from "./debug/routes";
import { registerRoutes } from "./http/routes";
import { createWorkspaceLeaseStore } from "./leases/service";

export type BuildAppOptions = {
  env?: Partial<AppConfig> & Record<string, string | undefined>;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const config = loadConfig({ ...process.env, ...options.env });
  const app = Fastify({ logger: false });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({ error: "Invalid request." });
    }
    throw error;
  });

  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]
  });
  await app.register(cookie);
  await registerRoutes(app, config, createWorkspaceLeaseStore(config));
  if (options.env?.NODE_ENV !== "production" && process.env.NODE_ENV !== "production") {
    await registerDebugRoutes(app);
  }

  return app;
}
