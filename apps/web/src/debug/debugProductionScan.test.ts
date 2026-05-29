import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listProductSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entryPath === path.join("apps", "web", "src", "debug")) continue;
      files.push(...listProductSourceFiles(entryPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

describe("debug production safety", () => {
  it("keeps product modules from importing development-only debug modules directly", () => {
    const productFiles = listProductSourceFiles(path.join("apps", "web", "src"));

    const offenders = productFiles.filter(file => readFileSync(file, "utf8").includes(".dev"));

    expect(offenders).toEqual([]);
  });

  it("exposes a single guarded DebugRoot entrypoint for product code", () => {
    const source = readFileSync("apps/web/src/debug/DebugRoot.tsx", "utf8");
    const nextConfig = readFileSync("apps/web/next.config.ts", "utf8");

    expect(source).toContain("./DebugRoot.target");
    expect(nextConfig).toContain("DebugRoot.target");
    expect(nextConfig).toContain("DebugRoot.production.tsx");
    expect(nextConfig).toContain("DebugRoot.development.tsx");
    expect(nextConfig).toContain("DebugCanvasSource.target");
    expect(nextConfig).toContain("DebugCanvasSource.production.tsx");
    expect(nextConfig).toContain("DebugCanvasSource.dev.tsx");
  });

  it("does not scan Next trace metadata as production executable content", () => {
    const source = readFileSync("scripts/verify-debug-free.mjs", "utf8");

    expect(source).toContain("path.endsWith(\".nft.json\")");
  });

  it("mounts the debug shell globally instead of inside the canvas page", () => {
    const layout = readFileSync("apps/web/src/app/layout.tsx", "utf8");
    const canvasWorkspace = readFileSync("apps/web/src/features/canvas/CanvasWorkspace.tsx", "utf8");
    const debugTypes = readFileSync("apps/web/src/debug/debugTypes.ts", "utf8");

    expect(layout).toContain("import { DebugRoot } from \"../debug/DebugRoot\"");
    expect(layout).toContain("<DebugRoot page=\"global\" />");
    expect(canvasWorkspace).not.toContain("DebugRoot");
    expect(debugTypes).toContain("page: \"global\"");
  });

  it("keeps canvas diagnostics as a data source for the global debug shell", () => {
    const canvasWorkspace = readFileSync("apps/web/src/features/canvas/CanvasWorkspace.tsx", "utf8");
    const source = readFileSync("apps/web/src/debug/DebugCanvasSource.tsx", "utf8");
    const devSource = readFileSync("apps/web/src/debug/DebugCanvasSource.dev.tsx", "utf8");
    const shell = readFileSync("apps/web/src/debug/DebugRoot.dev.tsx", "utf8");

    expect(canvasWorkspace).toContain("DebugCanvasSource");
    expect(source).toContain("./DebugCanvasSource.target");
    expect(devSource).toContain("setDebugPageSnapshot");
    expect(devSource).toContain("clearDebugPageSnapshot");
    expect(shell).toContain("useDebugPageSnapshot");
  });
});
