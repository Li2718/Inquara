import { describe, expect, it } from "vitest";
import { getCanvasListViewState } from "./canvasListViewState";

describe("canvas list view state", () => {
  it("keeps the login view mounted while post-login canvas opening is loading", () => {
    expect(getCanvasListViewState({ isLoading: true, needsLogin: true })).toBe("login");
  });

  it("leaves the login view after authentication succeeds", () => {
    expect(getCanvasListViewState({ isLoading: false, needsLogin: false })).toBe("canvas-loading");
  });
});
