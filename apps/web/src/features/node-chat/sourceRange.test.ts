import { describe, expect, it } from "vitest";
import { findSourceRange, getRangeContainerElement, getSourceRangeFromTextNodes, getTextRangeFromTextNodes } from "./sourceRange";

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

  it("maps rendered markdown text nodes back to raw markdown source offsets", () => {
    const boldText = Symbol("bold text");
    const tailText = Symbol("tail text");

    expect(
      getSourceRangeFromTextNodes(
        [
          {
            id: boldText,
            length: 5,
            sourceStart: 2,
            sourceEnd: 7
          },
          {
            id: tailText,
            length: 5,
            sourceStart: 10,
            sourceEnd: 15
          }
        ],
        {
          startNode: boldText,
          startOffset: 1,
          endNode: tailText,
          endOffset: 2
        }
      )
    ).toEqual({ start: 3, end: 12 });
  });

  it("maps nested rendered math text back to the whole formula source range", () => {
    const mathText = Symbol("katex text");

    expect(
      getSourceRangeFromTextNodes(
        [
          {
            id: mathText,
            length: 3,
            sourceStart: 5,
            sourceEnd: 14,
            offsetMode: "container"
          }
        ],
        {
          startNode: mathText,
          startOffset: 1,
          endNode: mathText,
          endOffset: 2
        }
      )
    ).toEqual({ start: 5, end: 14 });
  });

  it("maps selections whose boundary containers are formula wrapper elements", () => {
    const formulaElement = Symbol("formula element");
    const firstFormulaText = Symbol("first formula text");
    const secondFormulaText = Symbol("second formula text");

    expect(
      getSourceRangeFromTextNodes(
        [
          {
            id: firstFormulaText,
            owner: formulaElement,
            length: 2,
            sourceStart: 5,
            sourceEnd: 14,
            offsetMode: "container"
          },
          {
            id: secondFormulaText,
            owner: formulaElement,
            length: 2,
            sourceStart: 5,
            sourceEnd: 14,
            offsetMode: "container"
          }
        ],
        {
          startNode: formulaElement,
          startOffset: 0,
          endNode: formulaElement,
          endOffset: 2
        }
      )
    ).toEqual({ start: 5, end: 14 });
  });

  it("returns the container itself when a range common ancestor is already an element", () => {
    const messageElement = { nodeType: 1 } as Element & { nodeType: number };

    expect(getRangeContainerElement(messageElement)).toBe(messageElement);
  });

  it("returns the parent element when a range starts or ends inside a text node", () => {
    const parentElement = { nodeType: 1 } as Element & { nodeType: number };
    const textNode = { nodeType: 3, parentElement };

    expect(getRangeContainerElement(textNode)).toBe(parentElement);
  });
});
