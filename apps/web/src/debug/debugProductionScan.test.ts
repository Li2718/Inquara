import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("debug production safety", () => {
  it("keeps product modules from importing development-only debug modules directly", () => {
    const productFiles = globSync("apps/web/src/**/*.{ts,tsx}", {
      exclude: ["apps/web/src/debug/**"]
    });

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

  it("keeps the development debug shell draggable with a single tool style", () => {
    const shell = readFileSync("apps/web/src/debug/DebugRoot.dev.tsx", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(shell).toContain("debug_position");
    expect(shell).toContain("data-debug-placement");
    expect(shell).toContain("defaultPosition");
    expect(shell).toContain("onPointerDown");
    expect(shell).toContain("snapPosition");
    expect(shell).toContain("rawPosition");
    expect(shell).toContain("hasDragged");
    expect(shell).not.toContain("debug_theme");
    expect(shell).not.toContain("<small>tool</small>");
    expect(shell).not.toContain("placement.replace");
    expect(shell).not.toContain("glass");
    expect(shell).not.toContain("terminal");
    expect(styles).not.toContain("data-debug-theme");
    expect(styles).not.toContain("debug-theme-switcher");
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
