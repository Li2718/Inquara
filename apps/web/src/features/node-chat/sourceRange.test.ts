import { describe, expect, it } from "vitest";
import { findSourceRange } from "./sourceRange";

describe("findSourceRange", () => {
  it("maps normalized selected text back to the original message offsets", () => {
    expect(findSourceRange("第一行\n第二行  英雄传奇，后续", "第二行 英雄传奇")).toEqual({
      start: 4,
      end: 13
    });
  });

  it("returns null when the selected text is not from the message", () => {
    expect(findSourceRange("hello world", "missing")).toBeNull();
  });
});
