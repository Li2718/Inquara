import { describe, expect, it } from "vitest";
import { shouldHideCanvasUntilViewportReady } from "./canvasViewportReadiness";

describe("canvas viewport readiness", () => {
  it("keeps a cached route-matching canvas visible while the viewport reinitializes", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: true,
        isViewportReady: false,
        routeCanvasId: "canvas-1"
      })
    ).toBe(false);
  });

  it("hides a route-matching canvas until the first viewport initialization", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: false,
        isViewportReady: false,
        routeCanvasId: "canvas-1"
      })
    ).toBe(true);
  });

  it("hides stale cached canvas content from another route", () => {
    expect(
      shouldHideCanvasUntilViewportReady({
        canvasId: "canvas-1",
        hasCachedSnapshot: true,
        isViewportReady: false,
        routeCanvasId: "canvas-2"
      })
    ).toBe(true);
  });
});
