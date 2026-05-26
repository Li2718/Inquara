import { describe, expect, it } from "vitest";
import { findSourceRange, getTextRangeFromTextNodes } from "./sourceRange";

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

  it("maps the actual DOM selection range instead of the first repeated text match", () => {
    const messageText = "### 2. 意外险：便宜但很重要\n\n意外险主要保障：";
    const textNode = Symbol("message text");

    const selectedStart = messageText.lastIndexOf("意外险");
    const selectedEnd = selectedStart + "意外险".length;

    expect(
      getTextRangeFromTextNodes(
        [{ id: textNode, length: messageText.length }],
        {
          startNode: textNode,
          startOffset: selectedStart,
          endNode: textNode,
          endOffset: selectedEnd
        }
      )
    ).toEqual({
      start: selectedStart,
      end: selectedEnd
    });
  });

  it("accumulates offsets across split text nodes", () => {
    const firstNode = Symbol("first");
    const secondNode = Symbol("second");

    expect(
      getTextRangeFromTextNodes(
        [
          { id: firstNode, length: 8 },
          { id: secondNode, length: 12 }
        ],
        {
          startNode: secondNode,
          startOffset: 2,
          endNode: secondNode,
          endOffset: 5
        }
      )
    ).toEqual({ start: 10, end: 13 });
  });
});
