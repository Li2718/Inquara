import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import { loadConfig, type AppConfig } from "@inquara/config";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerDebugRoutes } from "./debug/routes";
import { registerRoutes } from "./http/routes";
import { createCanvasLeaseStore } from "./leases/service";

export type BuildAppOptions = {
  env?: Partial<AppConfig> & Record<string, string | undefined>;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const env = { ...process.env, ...options.env };
  const config = loadConfig(env);
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
  if (env.NODE_ENV !== "production") {
    const { registerDevelopmentApiDelay } = await import("./debug/developmentDelay.dev");
    registerDevelopmentApiDelay(app, env);
  }
  await registerRoutes(app, config, createCanvasLeaseStore(config));
  if (env.NODE_ENV !== "production") {
    await registerDebugRoutes(app);
  }

  return app;
}
