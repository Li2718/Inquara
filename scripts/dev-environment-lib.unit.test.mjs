import { describe, expect, it } from "vitest";
import { buildDatabaseUrl, ensureDatabaseUrl } from "./dev-env.mjs";
import {
  areRequiredServicesReady,
  getDevCommandPlan,
  getExistingServiceAction,
  getHealthCheckHost,
  getServerConfigFromUrl,
  getUrlPort,
  parseComposePsJson,
  resolveAvailableServerConfig,
  withUrlPort
} from "./dev-environment-lib.mjs";

describe("dev environment helpers", () => {
  it("parses docker compose ps output as JSON lines", () => {
    const rows = parseComposePsJson(
      [
        JSON.stringify({ Service: "postgres", State: "running", Health: "healthy" }),
        JSON.stringify({ Service: "other", State: "exited" })
      ].join("\n")
    );

    expect(rows).toHaveLength(2);
    expect(rows[0].Service).toBe("postgres");
  });

  it("requires postgres to be running and healthy", () => {
    expect(areRequiredServicesReady([{ Service: "postgres", State: "running", Health: "healthy" }])).toBe(true);
    expect(areRequiredServicesReady([{ Service: "postgres", State: "running", Health: "unhealthy" }])).toBe(false);
    expect(areRequiredServicesReady([])).toBe(false);
  });

  it("plans to bootstrap infrastructure before starting apps when infra is not ready", () => {
    expect(getDevCommandPlan({ hasDevComposeFile: true, infraReady: false })).toEqual(["bootstrap", "start"]);
    expect(getDevCommandPlan({ hasDevComposeFile: true, infraReady: true })).toEqual(["start"]);
  });

  it("reuses running app service pids", () => {
    expect(getExistingServiceAction({ pidRunning: true })).toBe("reuse");
    expect(getExistingServiceAction({ pidRunning: false })).toBe("restart");
  });

  it("derives server config from URLs and can update the port", () => {
    const url = new URL("http://localhost:3000");

    expect(getUrlPort(url)).toBe(3000);
    expect(getServerConfigFromUrl(url)).toEqual({ host: "localhost", port: 3000 });
    expect(withUrlPort(url, 3001).toString()).toBe("http://localhost:3001/");
  });

  it("uses loopback for wildcard health checks", () => {
    expect(getHealthCheckHost("0.0.0.0")).toBe("127.0.0.1");
    expect(getHealthCheckHost("localhost")).toBe("127.0.0.1");
  });

  it("scans for the next available port", async () => {
    const server = await resolveAvailableServerConfig(
      { host: "localhost", port: 3000 },
      {
        isPortAvailable: async (_host, port) => port === 3002,
        scanLimit: 5
      }
    );

    expect(server).toEqual({ host: "localhost", port: 3002 });
  });

  it("builds a local database URL from split postgres settings", () => {
    expect(
      buildDatabaseUrl({
        POSTGRES_USER: "dev_user",
        POSTGRES_PASSWORD: "dev password",
        POSTGRES_HOST: "localhost",
        POSTGRES_PORT: "55433",
        POSTGRES_DB: "inquara_dev",
        POSTGRES_SCHEMA: "custom"
      })
    ).toBe("postgresql://dev_user:dev%20password@localhost:55433/inquara_dev?schema=custom");
  });

  it("preserves an explicit database URL", () => {
    const env = {
      DATABASE_URL: "postgresql://explicit.example/inquara"
    };

    expect(ensureDatabaseUrl(env)).toBe("postgresql://explicit.example/inquara");
    expect(env.DATABASE_URL).toBe("postgresql://explicit.example/inquara");
  });
});
