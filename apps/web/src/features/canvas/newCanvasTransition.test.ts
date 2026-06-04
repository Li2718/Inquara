import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CanvasSnapshot } from "@inquara/domain";
import {
  advanceNewCanvasTransition,
  canSettleStarterTransition,
  hasRenderedStarterMessage,
  hasVisibleStarterMessage,
  initialNewCanvasTransitionState
} from "./newCanvasTransition";
import { NewCanvasMorphOverlay } from "./CanvasSurface";

describe("new canvas transition", () => {
  it("keeps the starter overlay while the created canvas is loading", () => {
    const morphing = advanceNewCanvasTransition(initialNewCanvasTransitionState, {
      content: "First question",
      submissionId: "submission-1",
      type: "submitted"
    });

    expect(morphing).toEqual({
      canvasId: null,
      content: "First question",
      submissionId: "submission-1",
      status: "morphing"
    });
  });

  it("attaches the real canvas id to the active starter overlay after creation returns", () => {
    const morphing = {
      canvasId: null,
      content: "First question",
      submissionId: "submission-1",
      status: "morphing" as const
    };

    expect(
      advanceNewCanvasTransition(morphing, {
        canvasId: "canvas-2",
        submissionId: "submission-2",
        type: "canvasCreated"
      })
    ).toBe(morphing);
    expect(
      advanceNewCanvasTransition(morphing, {
        canvasId: "canvas-1",
        submissionId: "submission-1",
        type: "canvasCreated"
      })
    ).toEqual({
      canvasId: "canvas-1",
      content: "First question",
      submissionId: "submission-1",
      status: "morphing"
    });
  });

  it("settles only when the starter message appears in the matching canvas", () => {
    const morphing = {
      canvasId: "canvas-1",
      content: "First question",
      submissionId: "submission-1",
      status: "morphing" as const
    };

    expect(advanceNewCanvasTransition(morphing, { canvasId: "canvas-2", type: "starterMessageVisible" })).toBe(morphing);
    expect(advanceNewCanvasTransition(morphing, { canvasId: "canvas-1", type: "starterMessageVisible" })).toEqual({
      canvasId: "canvas-1",
      content: "First question",
      submissionId: "submission-1",
      status: "settling"
    });
  });

  it("keeps the morph overlay mounted until the settle fade has finished", () => {
    const settling = {
      canvasId: "canvas-1",
      content: "First question",
      submissionId: "submission-1",
      status: "settling" as const
    };

    expect(advanceNewCanvasTransition(settling, { canvasId: "canvas-2", type: "overlaySettled" })).toBe(settling);
    expect(advanceNewCanvasTransition(settling, { canvasId: "canvas-1", type: "overlaySettled" })).toEqual({
      canvasId: null,
      content: "",
      status: "idle"
    });
  });

  it("detects the submitted user message in the current canvas snapshot", () => {
    expect(hasVisibleStarterMessage(snapshotWithStarterMessage, { canvasId: "canvas-1", content: "First question" })).toBe(true);
  });

  it("can settle once the starter user message is visible, even while the assistant reply is still pending", () => {
    expect(
      canSettleStarterTransition({
        snapshot: snapshotWithStarterMessage,
        starter: { canvasId: "canvas-1", content: "First question" }
      })
    ).toBe(true);

    expect(
      canSettleStarterTransition({
        snapshot: { ...snapshotWithStarterMessage, messages: [] },
        starter: { canvasId: "canvas-1", content: "First question" }
      })
    ).toBe(false);
  });

  it("matches the starter message only after the real message bubble renders", () => {
    expect(hasRenderedStarterMessage([], "First question")).toBe(false);
    expect(hasRenderedStarterMessage(["First question"], "First question")).toBe(true);
    expect(hasRenderedStarterMessage(["First\nquestion"], "First question")).toBe(true);
    expect(hasRenderedStarterMessage(["Different question"], "First question")).toBe(false);
  });

  it("renders the morph send control with the normal send label", () => {
    const markup = renderToStaticMarkup(
      createElement(NewCanvasMorphOverlay, {
        content: "First question",
        placeholder: "Ask here",
        sendLabel: "Send",
        state: "morphing",
        thinkingLabel: "Thinking..."
      })
    );

    expect(markup).toContain("Send");
    expect(markup).toContain('data-state="morphing"');
    expect(markup).toContain("node-composer-frame-submit");
    expect(markup).not.toContain("new-canvas-morph-send");
  });

  it("renders the submitted question with the normal user message bubble", () => {
    const markup = renderToStaticMarkup(
      createElement(NewCanvasMorphOverlay, {
        content: "First question",
        placeholder: "Ask here",
        sendLabel: "Send",
        state: "morphing",
        thinkingLabel: "Thinking..."
      })
    );

    expect(markup).toContain('class="message-bubble message-user new-canvas-morph-user-message"');
    expect(markup).toContain("<p><span");
    expect(markup).toContain("First question");
    expect(markup.match(/class="message-bubble message-user new-canvas-morph-user-message"/gu)?.length).toBe(1);
  });

  it("renders a title bar and thinking assistant bubble during the morph overlay", () => {
    const markup = renderToStaticMarkup(
      createElement(NewCanvasMorphOverlay, {
        content: "First question",
        placeholder: "Ask here",
        sendLabel: "Send",
        state: "morphing",
        thinkingLabel: "Thinking..."
      })
    );

    expect(markup).toContain('class="canvas-node-header');
    expect(markup).toContain('class="canvas-node-title-row new-canvas-morph-title"');
    expect(markup).toContain("<strong>First question</strong>");
    expect(markup).toContain('class="message-bubble message-user new-canvas-morph-user-message"');
    expect(markup).toContain('class="message-bubble message-assistant new-canvas-morph-thinking-message"');
    expect(markup).toContain("Thinking...");
  });
});

const snapshotWithStarterMessage: CanvasSnapshot = {
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
};
