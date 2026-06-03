import { describe, expect, it, vi } from "vitest";
import { parseCanvasPathState, writeCanvasPathState } from "./canvasUrlState";

describe("canvas URL state", () => {
  it("parses a new-canvas path as local new mode", () => {
    expect(parseCanvasPathState("/canvases/new")).toEqual({ mode: "new" });
  });

  it("parses a canvas path as an existing canvas", () => {
    expect(parseCanvasPathState("/canvases/canvas-1")).toEqual({
      canvasId: "canvas-1",
      mode: "canvas"
    });
  });

  it("writes canvas state with history without using router navigation", () => {
    const pushState = vi.fn();
    const replaceState = vi.fn();
    const windowRef = {
      history: { pushState, replaceState },
      location: { pathname: "/canvases/canvas-1" }
    } as unknown as Window;

    writeCanvasPathState({ mode: "new" }, { windowRef });
    writeCanvasPathState({ canvasId: "canvas-2", mode: "canvas" }, { replace: true, windowRef });

    expect(pushState).toHaveBeenCalledWith(null, "", "/canvases/new");
    expect(replaceState).toHaveBeenCalledWith(null, "", "/canvases/canvas-2");
  });

  it("does not rewrite history when the path already matches state", () => {
    const pushState = vi.fn();
    const windowRef = {
      history: { pushState, replaceState: vi.fn() },
      location: { pathname: "/canvases/new" }
    } as unknown as Window;

    writeCanvasPathState({ mode: "new" }, { windowRef });

    expect(pushState).not.toHaveBeenCalled();
  });
});
