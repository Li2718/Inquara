import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared button components", () => {
  it("exports discoverable icon and floating circle buttons", () => {
    expect(existsSync("apps/web/src/shared/components/ui/IconButton.tsx")).toBe(true);
    expect(existsSync("apps/web/src/shared/components/ui/FloatingCircleButton.tsx")).toBe(true);

    const barrel = readFileSync("apps/web/src/shared/components/ui/index.ts", "utf8");

    expect(barrel).toContain("IconButton");
    expect(barrel).toContain("FloatingCircleButton");
  });

  it("owns the current visual class hooks without changing the existing CSS contract", () => {
    const iconButton = readFileSync("apps/web/src/shared/components/ui/IconButton.tsx", "utf8");
    const floatingCircleButton = readFileSync("apps/web/src/shared/components/ui/FloatingCircleButton.tsx", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(iconButton).toContain("icon-button");
    expect(floatingCircleButton).toContain("canvas-floating-circle-button");
    expect(floatingCircleButton).toContain("data-size");
    expect(styles).toContain(".icon-button");
    expect(styles).toContain(".canvas-floating-circle-button");
  });

  it("is used by current canvas icon and floating circle buttons", () => {
    const canvasNodeView = readFileSync("apps/web/src/features/canvas/CanvasNodeView.tsx", "utf8");
    const canvasView = readFileSync("apps/web/src/features/canvas/CanvasView.tsx", "utf8");
    const canvasWorkspace = readFileSync("apps/web/src/features/canvas/CanvasWorkspace.tsx", "utf8");

    expect(canvasNodeView).toContain("IconButton");
    expect(canvasNodeView).not.toContain('className="icon-button');
    expect(canvasView).toContain("FloatingCircleButton");
    expect(canvasView).not.toContain('className="canvas-floating-circle-button"');
    expect(canvasWorkspace).toContain("FloatingCircleButton");
    expect(canvasWorkspace).not.toContain('className="canvas-floating-circle-button canvas-account-button"');
  });
});
