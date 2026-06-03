import { describe, expect, it } from "vitest";
import { getCanvasDeleteDialogOpeningState } from "./canvasDeleteDialogState";

describe("canvas delete dialog state", () => {
  it("resets confirming state before opening another canvas delete dialog", () => {
    const canvas = { id: "canvas-2", title: "Second canvas" };

    expect(getCanvasDeleteDialogOpeningState(canvas)).toEqual({
      activeMenuId: null,
      deletingCanvas: canvas,
      isDeleting: false
    });
  });
});
