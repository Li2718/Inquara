import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { developmentDelay } from "./developmentDelay";

const baseEnv = {
  DATABASE_URL: "postgresql://debug:debug@localhost:1/inquara_debug_test?schema=public",
  REDIS_URL: "redis://test.local:6379",
  SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
  WEB_ORIGIN: "http://localhost:3000",
  API_ORIGIN: "http://localhost:4000",
  AI_PROVIDER: "fake" as const
};

describe("debug routes", () => {
  afterEach(() => {
    developmentDelay.wait = async function () {
      return;
    };
  });

  it("registers /debug/health outside production", async () => {
    const app = await buildApp({ env: { ...baseEnv, NODE_ENV: "development" } });

    const response = await app.inject({ method: "GET", url: "/debug/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, debug: true });
    await app.close();
  });

  it("does not register /debug/health in production", async () => {
    const originalWait = developmentDelay.wait;
    const app = await buildApp({ env: { ...baseEnv, INQUARA_DEV_API_DELAY_MS: "1", NODE_ENV: "production" } });

    const response = await app.inject({ method: "GET", url: "/debug/health" });

    expect(response.statusCode).toBe(404);
    expect(developmentDelay.wait).toBe(originalWait);
    await app.close();
  });

  it("enables development-only API delay for every API route outside production", async () => {
    const app = await buildApp({ env: { ...baseEnv, INQUARA_DEV_API_DELAY_MS: "40", NODE_ENV: "development" } });
    const startedAt = Date.now();

    const response = await app.inject({ method: "GET", url: "/healthz" });

    expect(response.statusCode).toBe(200);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(35);
    await app.close();
  });

  it("keeps debug API paths under /debug", () => {
    const source = readFileSync("apps/api/src/debug/routes.ts", "utf8");
    const routePaths = Array.from(source.matchAll(/app\.(?:get|post|put|patch|delete)\("([^"]+)"/g)).map(match => match[1]);

    expect(routePaths.length).toBeGreaterThan(0);
    expect(routePaths.every(path => path?.startsWith("/debug/"))).toBe(true);
  });

  it("removes API development-only modules from the production image", () => {
    const source = readFileSync("apps/api/Dockerfile", "utf8");

    expect(source).toContain("find apps/api/src -name '*.dev.ts' -delete");
  });
});
