import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canvas reset view control", () => {
  it("uses custom viewport controls instead of React Flow controls", () => {
    const source = readFileSync("apps/web/src/features/canvas/CanvasView.tsx", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(source).not.toMatch(/import\s*\{[^}]*\bControls\b[^}]*\}\s*from "@xyflow\/react"/);
    expect(source).toContain("useViewport");
    expect(source).toContain("setViewport");
    expect(source).toContain("findFirstVisibleRootNode");
    expect(source).toContain("ROOT_VIEWPORT_ZOOM = 1");
    expect(source).toContain("workspace-sidebar");
    expect(source).toContain("reservedLeft");
    expect(source).toContain("hideAttribution: true");
    expect(source).toContain("canvas-viewport-controls");
    expect(source).toContain("canvas-floating-circle-button");
    expect(source).toContain('data-size="sm"');
    expect(source).toContain("Current zoom");
    expect(source).toContain("Reset view to root chat");
    expect(styles).toMatch(/\.canvas-floating-circle-button\s*{/);
    expect(styles).toContain('.canvas-floating-circle-button[data-size="sm"]');
    expect(styles).toContain('.canvas-floating-circle-button[data-size="md"]');
    expect(styles).toMatch(/\.canvas-viewport-controls\s*{/);
  });
});
