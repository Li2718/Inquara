import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared PopupMenu component", () => {
  it("exists as a discoverable shared UI interaction", () => {
    expect(existsSync("apps/web/src/shared/components/ui/PopupMenu.tsx")).toBe(true);
    expect(existsSync("apps/web/src/shared/components/ui/index.ts")).toBe(true);

    const component = readFileSync("apps/web/src/shared/components/ui/PopupMenu.tsx", "utf8");
    const barrel = readFileSync("apps/web/src/shared/components/ui/index.ts", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(component).toContain("export function PopupMenu");
    expect(component).toContain("export function PopupMenuItem");
    expect(component).toContain("pointerdown");
    expect(component).toContain("Escape");
    expect(barrel).toContain("PopupMenu");
    expect(styles).toContain(".ui-popup-menu");
    expect(styles).toContain(".ui-popup-menu-item");
  });

  it("is used by current product menus instead of local menu surfaces", () => {
    const workspaceSidebar = readFileSync("apps/web/src/features/workspaces/WorkspaceSidebar.tsx", "utf8");
    const canvasNodeView = readFileSync("apps/web/src/features/canvas/CanvasNodeView.tsx", "utf8");
    const canvasView = readFileSync("apps/web/src/features/canvas/CanvasView.tsx", "utf8");
    const canvasWorkspace = readFileSync("apps/web/src/features/canvas/CanvasWorkspace.tsx", "utf8");

    expect(workspaceSidebar).toContain("PopupMenu");
    expect(canvasNodeView).toContain("PopupMenu");
    expect(canvasView).toContain("PopupMenu");
    expect(canvasWorkspace).toContain("PopupMenu");
    expect(canvasWorkspace).toContain('tone="danger"');
  });
});
