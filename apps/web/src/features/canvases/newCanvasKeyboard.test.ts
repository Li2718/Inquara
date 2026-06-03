import { describe, expect, it } from "vitest";
import { shouldSubmitNewCanvasStarter } from "./newCanvasKeyboard";

describe("new canvas starter keyboard", () => {
  it("submits on plain Enter", () => {
    expect(
      shouldSubmitNewCanvasStarter({
        isComposing: false,
        key: "Enter",
        shiftKey: false
      })
    ).toBe(true);
  });

  it("keeps Shift Enter available for line breaks", () => {
    expect(
      shouldSubmitNewCanvasStarter({
        isComposing: false,
        key: "Enter",
        shiftKey: true
      })
    ).toBe(false);
  });

  it("does not submit while an input method is composing text", () => {
    expect(
      shouldSubmitNewCanvasStarter({
        isComposing: true,
        key: "Enter",
        shiftKey: false
      })
    ).toBe(false);
  });
});
