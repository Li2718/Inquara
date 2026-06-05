import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("next config", () => {
  it("pins output file tracing to the current worktree root", async () => {
    const configModuleUrl = pathToFileURL(path.resolve("apps/web/next.config.ts")).href;
    const { default: nextConfig } = await import(configModuleUrl);

    expect(nextConfig.outputFileTracingRoot).toBe(path.resolve("."));
  });

  it("aliases debug targets from the web app directory during monorepo builds", async () => {
    const configModuleUrl = pathToFileURL(path.resolve("apps/web/next.config.ts")).href;
    const { default: nextConfig } = await import(configModuleUrl);
    const config = { resolve: { alias: {} as Record<string, string> } };

    nextConfig.webpack?.(config, { dev: false });

    expect(config.resolve.alias[path.resolve("apps/web/src/debug/DebugRoot.target.tsx")]).toBe(
      path.resolve("apps/web/src/debug/DebugRoot.production.tsx")
    );
    expect(config.resolve.alias[path.resolve("apps/web/src/debug/DebugCanvasSource.target.tsx")]).toBe(
      path.resolve("apps/web/src/debug/DebugCanvasSource.production.tsx")
    );
  });
});
