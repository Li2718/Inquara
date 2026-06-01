import { describe, expect, it } from "vitest";
import path from "node:path";
import { buildDatabaseUrl, ensureDatabaseUrl } from "./dev-env.mjs";
import {
  areRequiredServicesReady,
  createDevRuntimeState,
  doesRuntimeStateMatchExpectation,
  getDevComposeProjectName,
  getDevCommandPlan,
  getExistingServiceAction,
  getHealthCheckHost,
  getReusableServiceOrigin,
  resolveDevInfrastructure,
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
    expect(
      areRequiredServicesReady([
        { Service: "postgres", State: "running", Health: "healthy" },
        { Service: "redis", State: "running" }
      ])
    ).toBe(true);
    expect(
      areRequiredServicesReady([
        { Service: "postgres", State: "running", Health: "healthy" }
      ])
    ).toBe(false);
    expect(
      areRequiredServicesReady([
        { Service: "postgres", State: "running", Health: "unhealthy" },
        { Service: "redis", State: "running" }
      ])
    ).toBe(false);
    expect(areRequiredServicesReady([])).toBe(false);
  });

  it("plans to bootstrap infrastructure before starting apps when infra is not ready", () => {
    expect(getDevCommandPlan({ hasDevInfrastructure: true, infraReady: false })).toEqual(["bootstrap", "start"]);
    expect(getDevCommandPlan({ hasDevInfrastructure: true, infraReady: true })).toEqual(["start"]);
  });

  it("uses the managed repo root to share the dev compose project across worktrees", () => {
    expect(getDevComposeProjectName("/workspace/inquara")).toBe("inquara");
    expect(getDevComposeProjectName("/workspace/inquara/.worktrees/feature-debug-toolbar")).toBe(
      "feature-debug-toolbar"
    );
  });

  it("uses the main workspace compose file for a managed worktree without local infra", () => {
    const infrastructure = resolveDevInfrastructure("/workspace/inquara/.worktrees/feature-debug-toolbar", {
        exists: filePath => filePath.endsWith("D:\\codes\\li2718\\Inquara\\docker-compose.dev.yml")
    });

    expect(path.normalize(infrastructure.composeRootDir)).toBe(path.normalize("/workspace/inquara"));
    expect(infrastructure).toMatchObject({
      mode: "shared",
      projectName: "inquara"
    });
  });

  it("uses the current worktree compose file when a worktree has private infra", () => {
    expect(
      resolveDevInfrastructure("/workspace/inquara/.worktrees/feature-debug-toolbar", {
        exists: filePath => filePath.endsWith("feature-debug-toolbar\\docker-compose.dev.yml")
      })
    ).toMatchObject({
      composeRootDir: "/workspace/inquara/.worktrees/feature-debug-toolbar",
      mode: "private",
      projectName: "feature-debug-toolbar"
    });
  });

  it("derives compose project names from the selected infrastructure root", () => {
    expect(getDevComposeProjectName("/workspace/inquara")).toBe("inquara");
    expect(getDevComposeProjectName("/workspace/inquara/.worktrees/feature-debug-toolbar")).toBe(
      "feature-debug-toolbar"
    );
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

  it("tracks infrastructure-sensitive API runtime settings", () => {
    const runtimeState = createDevRuntimeState({
      apiUrl: new URL("http://localhost:4000"),
      databaseUrl: "postgresql://inquara:inquara@localhost:55433/inquara?schema=public",
      infrastructure: {
        composePath: "/workspace/inquara/.worktrees/feature-debug-toolbar/docker-compose.dev.yml",
        mode: "private",
        projectName: "feature-debug-toolbar"
      },
      redisUrl: "redis://localhost:56381",
      webUrl: new URL("http://localhost:3001")
    });

    expect(getServiceStateExpectation("api", runtimeState)).toEqual({
      apiOrigin: "http://localhost:4000",
      databaseUrl: "postgresql://inquara:inquara@localhost:55433/inquara?schema=public",
      infrastructureComposePath: "/workspace/inquara/.worktrees/feature-debug-toolbar/docker-compose.dev.yml",
      infrastructureMode: "private",
      infrastructureProjectName: "feature-debug-toolbar",
      redisUrl: "redis://localhost:56381"
    });
    expect(
      doesRuntimeStateMatchExpectation(
        {
          ...runtimeState,
          databaseUrl: "postgresql://inquara:inquara@localhost:55432/inquara?schema=public"
        },
        getServiceStateExpectation("api", runtimeState)
      )
    ).toBe(false);
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
