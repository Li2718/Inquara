import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { advanceNewCanvasTransition, initialNewCanvasTransitionState, hasVisibleStarterMessage } from "./newCanvasTransition";
import { NewCanvasMorphOverlay } from "./CanvasWorkspace";

describe("new canvas transition", () => {
  it("keeps the starter overlay while the created workspace is loading", () => {
    const morphing = advanceNewCanvasTransition(initialNewCanvasTransitionState, {
      content: "First question",
      type: "submitted",
      workspaceId: "workspace-1"
    });

    expect(morphing).toEqual({
      content: "First question",
      status: "morphing",
      workspaceId: "workspace-1"
    });
  });

  it("settles only when the starter message appears in the matching workspace", () => {
    const morphing = {
      content: "First question",
      status: "morphing" as const,
      workspaceId: "workspace-1"
    };

    expect(advanceNewCanvasTransition(morphing, { type: "starterMessageVisible", workspaceId: "workspace-2" })).toBe(morphing);
    expect(advanceNewCanvasTransition(morphing, { type: "starterMessageVisible", workspaceId: "workspace-1" })).toEqual({
      content: "",
      status: "idle",
      workspaceId: null
    });
  });

  it("detects the submitted user message in the current workspace snapshot", () => {
    expect(
      hasVisibleStarterMessage(
        {
          workspace: {
            id: "workspace-1",
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
              id: "message-1",
              workspaceId: "workspace-1",
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
        { content: "First question", workspaceId: "workspace-1" }
      )
    ).toBe(true);
  });

  it("renders the morph send control with the normal send label", () => {
    const markup = renderToStaticMarkup(createElement(NewCanvasMorphOverlay, { content: "First question", sendLabel: "Send" }));

    expect(markup).toContain("Send");
    expect(markup).toContain("new-canvas-morph-send");
  });
});
