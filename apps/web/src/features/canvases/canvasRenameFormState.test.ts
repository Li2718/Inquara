import { describe, expect, it } from "vitest";
import { getCanvasRenameFormState } from "./canvasRenameFormState";

describe("canvas rename form state", () => {
  it("disables the rename input and save button while that canvas is saving", () => {
    expect(getCanvasRenameFormState({ canvasId: "canvas-1", savingCanvasId: "canvas-1" })).toEqual({
      isDisabled: true,
      isSaving: true
    });
  });

  it("keeps other rename forms interactive while a different canvas is saving", () => {
    expect(getCanvasRenameFormState({ canvasId: "canvas-2", savingCanvasId: "canvas-1" })).toEqual({
      isDisabled: false,
      isSaving: false
    });
  });
});
