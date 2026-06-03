import { describe, expect, it, vi } from "vitest";
import { parseCanvasPathState, writeCanvasPathState } from "./canvasUrlState";

describe("canvas URL state", () => {
  it("parses a new-canvas path as local new mode", () => {
    expect(parseCanvasPathState("/workspaces/new")).toEqual({ mode: "new" });
  });

  it("parses a workspace path as an existing workspace", () => {
    expect(parseCanvasPathState("/workspaces/workspace-1")).toEqual({
      mode: "workspace",
      workspaceId: "workspace-1"
    });
  });

  it("writes canvas state with history without using router navigation", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    const windowRef = {
      history: { pushState, replaceState },
      location: { pathname: "/workspaces/workspace-1" }
    } as unknown as Window;

    writeCanvasPathState({ mode: "new" }, { windowRef });
    writeCanvasPathState({ mode: "workspace", workspaceId: "workspace-2" }, { replace: true, windowRef });

    expect(pushState).toHaveBeenCalledWith(null, "", "/workspaces/new");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/workspaces/workspace-2");
  });

  it("does not rewrite history when the path already matches state", () => {
    const pushState = vi.fn();
    const windowRef = {
      history: { pushState, replaceState: vi.fn() },
      location: { pathname: "/workspaces/new" }
    } as unknown as Window;

    writeCanvasPathState({ mode: "new" }, { windowRef });

    expect(pushState).not.toHaveBeenCalled();
  });
});
