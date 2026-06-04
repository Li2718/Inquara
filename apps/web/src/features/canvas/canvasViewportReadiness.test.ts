import { describe, expect, it } from "vitest";
import { shouldHideCanvasUntilViewportReady } from "./canvasViewportReadiness";

describe("canvas viewport readiness", () => {
  it("keeps a cached canvas visible while the viewport reinitializes", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: true,
        isViewportReady: false
      })
    ).toBe(false);
  });

  it("hides a canvas without cache until the first viewport initialization", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: false,
        isViewportReady: false
      })
    ).toBe(true);
  });

  it("keeps the current display canvas visible while a new route is loading", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: true,
        isViewportReady: false
      })
    ).toBe(false);
  });
});
