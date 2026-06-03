import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { advanceNewCanvasTransition, initialNewCanvasTransitionState, hasVisibleStarterMessage } from "./newCanvasTransition";
import { NewCanvasMorphOverlay } from "./CanvasSurface";

describe("new canvas transition", () => {
  it("keeps the starter overlay while the created canvas is loading", () => {
    const morphing = advanceNewCanvasTransition(initialNewCanvasTransitionState, {
      canvasId: "canvas-1",
      content: "First question",
      type: "submitted"
    });

    expect(morphing).toEqual({
      canvasId: "canvas-1",
      content: "First question",
      status: "morphing"
    });
  });

  it("settles only when the starter message appears in the matching canvas", () => {
    const morphing = {
      canvasId: "canvas-1",
      content: "First question",
      status: "morphing" as const
    };

    expect(advanceNewCanvasTransition(morphing, { canvasId: "canvas-2", type: "starterMessageVisible" })).toBe(morphing);
    expect(advanceNewCanvasTransition(morphing, { canvasId: "canvas-1", type: "starterMessageVisible" })).toEqual({
      canvasId: null,
      content: "",
      status: "idle"
    });
  });

  it("detects the submitted user message in the current canvas snapshot", () => {
    expect(
      hasVisibleStarterMessage(
        {
          canvas: {
            id: "canvas-1",
            ownerId: "user-1",
            title: "Untitled",
            version: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
          },
          nodes: [],
          edges: [],
          messages: [
            {
              canvasId: "canvas-1",
              id: "message-1",
              nodeId: "node-1",
              role: "user",
              content: "First question",
              status: "complete",
              model: null,
              errorMessage: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z"
            }
          ]
        },
        { canvasId: "canvas-1", content: "First question" }
      )
    ).toBe(true);
  });

  it("renders the morph send control with the normal send label", () => {
    const markup = renderToStaticMarkup(createElement(NewCanvasMorphOverlay, { content: "First question", sendLabel: "Send" }));

    expect(markup).toContain("Send");
    expect(markup).toContain("new-canvas-morph-send");
  });
});
