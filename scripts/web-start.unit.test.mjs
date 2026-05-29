import { describe, expect, it, vi } from "vitest";
import { buildNormalWebCommand, decideWebStartupMode, isMainModule, startWeb } from "./web-start.mjs";

describe("web startup selector", () => {
  const silentLogger = { log: vi.fn() };

  it("selects setup mode only while the deployment has no users", () => {
    expect(decideWebStartupMode(false)).toBe("setup");
    expect(decideWebStartupMode(true)).toBe("normal");
  });

  it("builds the normal Next start command for the web workspace", () => {
    expect(buildNormalWebCommand({ serverHost: "127.0.0.1", serverPort: "3100" })).toEqual({
      command: "npm",
      args: ["run", "start", "--workspace", "@inquara/web", "--", "-H", "127.0.0.1", "-p", "3100"]
    });
  });

  it("recognizes the script entrypoint on Windows paths", () => {
    expect(isMainModule("file:///<repo-root-placeholder>/scripts/web-start.mjs", "<repo-root-placeholder>---\\scripts\\web-start.mjs")).toBe(true);
  });

  it("starts the setup server when no user exists", async () => {
    const startSetupServer = vi.fn();
    const runNormalWeb = vi.fn();

    await startWeb({
      hasCompletedSetup: async () => false,
      startSetupServer,
      runNormalWeb,
      logger: silentLogger
    });

    expect(startSetupServer).toHaveBeenCalledOnce();
    expect(runNormalWeb).not.toHaveBeenCalled();
  });

  it("starts the normal web app when a user exists", async () => {
    const startSetupServer = vi.fn();
    const runNormalWeb = vi.fn();

    await startWeb({
      hasCompletedSetup: async () => true,
      startSetupServer,
      runNormalWeb,
      logger: silentLogger
    });

    expect(runNormalWeb).toHaveBeenCalledOnce();
    expect(startSetupServer).not.toHaveBeenCalled();
  });
});
