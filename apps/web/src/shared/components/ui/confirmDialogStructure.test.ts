import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared ConfirmDialog component", () => {
  it("is exported from the shared ui barrel", () => {
    expect(existsSync("apps/web/src/shared/components/ui/ConfirmDialog.tsx")).toBe(true);

    const barrel = readFileSync("apps/web/src/shared/components/ui/index.ts", "utf8");

    expect(barrel).toContain("ConfirmDialog");
  });

  it("owns modal accessibility and close behavior", () => {
    const component = readFileSync("apps/web/src/shared/components/ui/ConfirmDialog.tsx", "utf8");

    expect(component).toContain("createPortal");
    expect(component).toContain('role="dialog"');
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain('event.key === "Escape"');
    expect(component).toContain("onPointerDown");
    expect(component).toContain("ui-confirm-dialog");
  });

  it("is used by node delete, workspace delete, and logout confirmation flows", () => {
    const canvasNodeView = readFileSync("apps/web/src/features/canvas/CanvasNodeView.tsx", "utf8");
    const workspaceSidebar = readFileSync("apps/web/src/features/workspaces/WorkspaceSidebar.tsx", "utf8");
    const canvasWorkspace = readFileSync("apps/web/src/features/canvas/CanvasWorkspace.tsx", "utf8");

    expect(canvasNodeView).toContain("ConfirmDialog");
    expect(canvasNodeView).not.toContain("confirm-dialog");
    expect(workspaceSidebar).toContain("ConfirmDialog");
    expect(workspaceSidebar).not.toContain("workspace-delete-dialog");
    expect(canvasWorkspace).toContain("ConfirmDialog");
    expect(canvasWorkspace).toContain("Log out?");
  });
});
