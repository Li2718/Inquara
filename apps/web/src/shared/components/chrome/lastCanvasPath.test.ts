import { describe, expect, it, vi } from "vitest";
import { getLastCanvasPath, rememberLastCanvasPath } from "./lastCanvasPath";

describe("last canvas path", () => {
  it("remembers canvas routes for later cross-surface navigation", () => {
    const setItem = vi.fn();
    const getItem = vi.fn(() => "/canvases/canvas-1");
    const windowRef = {
      location: { pathname: "/canvases/canvas-1" },
      sessionStorage: { getItem, setItem }
    } as unknown as Window;

    rememberLastCanvasPath(windowRef);

    expect(setItem).toHaveBeenCalledWith("inquara:last-canvas-path", "/canvases/canvas-1");
    expect(getLastCanvasPath(windowRef)).toBe("/canvases/canvas-1");
  });

  it("ignores non-canvas and new-canvas routes", () => {
    const setItem = vi.fn();
    const windowRef = {
      location: { pathname: "/admin/users" },
      sessionStorage: { getItem: vi.fn(), setItem }
    } as unknown as Window;

    rememberLastCanvasPath(windowRef);

    expect(setItem).not.toHaveBeenCalled();
  });
});
