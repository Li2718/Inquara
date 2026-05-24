import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildApp } from "../app";

const baseEnv = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://inquara:inquara@localhost:55432/inquara?schema=public",
  SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
  WEB_ORIGIN: "http://localhost:3000",
  API_ORIGIN: "http://localhost:4000",
  AI_PROVIDER: "fake" as const
};

describe("debug routes", () => {
  it("registers /debug/health outside production", async () => {
    const app = await buildApp({ env: { ...baseEnv, NODE_ENV: "development" } });

    const response = await app.inject({ method: "GET", url: "/debug/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, debug: true });
    await app.close();
  });

  it("does not register /debug/health in production", async () => {
    const app = await buildApp({ env: { ...baseEnv, NODE_ENV: "production" } });

    const response = await app.inject({ method: "GET", url: "/debug/health" });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it("keeps debug API paths under /debug", () => {
    const source = readFileSync("apps/api/src/debug/routes.ts", "utf8");
    const routePaths = Array.from(source.matchAll(/app\.(?:get|post|put|patch|delete)\("([^"]+)"/g)).map(match => match[1]);

    expect(routePaths.length).toBeGreaterThan(0);
    expect(routePaths.every(path => path?.startsWith("/debug/"))).toBe(true);
  });
});
