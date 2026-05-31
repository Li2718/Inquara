import { describe, expect, it } from "vitest";
import { buildDatabaseUrl, ensureDatabaseUrl } from "./dev-env.mjs";
import {
  areRequiredServicesReady,
  createDevRuntimeState,
  doesRuntimeStateMatchExpectation,
  getDevCommandPlan,
  getExistingServiceAction,
  getHealthCheckHost,
  getReusableServiceOrigin,
  getServiceStateExpectation,
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

  it("keeps web runtime state connected to the resolved API port", () => {
    const runtimeState = createDevRuntimeState({
      apiUrl: new URL("http://localhost:4002"),
      webUrl: new URL("http://localhost:3000")
    });

    expect(runtimeState).toEqual({
      apiOrigin: "http://localhost:4002",
      webOrigin: "http://localhost:3000",
      nextPublicApiOrigin: "http://localhost:4002",
      nextPublicWsOrigin: "ws://localhost:4002"
    });
    expect(getServiceStateExpectation("web", runtimeState)).toEqual({
      webOrigin: "http://localhost:3000",
      nextPublicApiOrigin: "http://localhost:4002",
      nextPublicWsOrigin: "ws://localhost:4002"
    });
  });

  it("detects when a running web process was started with stale API settings", () => {
    const runtimeState = createDevRuntimeState({
      apiUrl: new URL("http://localhost:4002"),
      webUrl: new URL("http://localhost:3000")
    });
    const staleState = {
      webOrigin: "http://localhost:3000",
      nextPublicApiOrigin: "http://localhost:4000",
      nextPublicWsOrigin: "ws://localhost:4000"
    };

    expect(doesRuntimeStateMatchExpectation(staleState, getServiceStateExpectation("web", runtimeState))).toBe(false);
    expect(doesRuntimeStateMatchExpectation(runtimeState, getServiceStateExpectation("web", runtimeState))).toBe(true);
  });

  it("reuses current session origins instead of treating their ports as conflicts", () => {
    const runtimeState = createDevRuntimeState({
      apiUrl: new URL("http://localhost:4002"),
      webUrl: new URL("http://localhost:3001")
    });

    expect(getReusableServiceOrigin("api", runtimeState, { pidRunning: true })?.toString()).toBe("http://localhost:4002/");
    expect(getReusableServiceOrigin("web", runtimeState, { pidRunning: true })?.toString()).toBe("http://localhost:3001/");
    expect(getReusableServiceOrigin("api", runtimeState, { pidRunning: false })).toBeNull();
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
