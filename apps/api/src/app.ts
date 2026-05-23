import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { loadConfig, type AppConfig } from "@inquara/config";
import Fastify from "fastify";
import { registerRoutes } from "./http/routes";

export type BuildAppOptions = {
  env?: Partial<AppConfig> & Record<string, string | undefined>;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const config = loadConfig({ ...process.env, ...options.env });
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: config.WEB_ORIGIN,
    credentials: true
  });
  await app.register(cookie);
  await app.register(websocket);
  await registerRoutes(app, config);

  return app;
}
