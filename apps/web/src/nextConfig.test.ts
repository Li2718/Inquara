import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

describe("next config", () => {
  it("pins output file tracing to the current worktree root", async () => {
    const configModuleUrl = pathToFileURL(path.resolve("apps/web/next.config.ts")).href;
    const { default: nextConfig } = await import(configModuleUrl);

    expect(nextConfig.outputFileTracingRoot).toBe(path.resolve("."));
  });
});
