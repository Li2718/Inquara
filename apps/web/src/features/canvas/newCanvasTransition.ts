import type { CanvasSnapshot } from "@inquara/domain";

export type NewCanvasTransitionState =
  | {
      content: "";
      status: "idle";
      canvasId: null;
    }
  | {
      canvasId: string | null;
      content: string;
      submissionId: string;
      status: "morphing";
    }
  | {
      canvasId: string;
      content: string;
      submissionId: string;
      status: "settling";
    };

export type NewCanvasTransitionEvent =
  | {
      content: string;
      submissionId: string;
      type: "submitted";
    }
  | {
      canvasId: string;
      submissionId: string;
      type: "canvasCreated";
    }
  | {
      canvasId: string;
      type: "starterMessageVisible";
    }
  | {
      canvasId: string;
      type: "overlaySettled";
    }
  | {
      type: "reset";
    };

export const initialNewCanvasTransitionState: NewCanvasTransitionState = {
  content: "",
  status: "idle",
  canvasId: null
};

export function advanceNewCanvasTransition(
  state: NewCanvasTransitionState,
  event: NewCanvasTransitionEvent
): NewCanvasTransitionState {
  if (event.type === "submitted") {
    return {
      canvasId: null,
      content: event.content,
      submissionId: event.submissionId,
      status: "morphing"
    };
  }

  if (event.type === "canvasCreated") {
    if (state.status !== "morphing" || state.submissionId !== event.submissionId) return state;
    return {
      canvasId: event.canvasId,
      content: state.content,
      submissionId: state.submissionId,
      status: "morphing"
    };
  }

  if (event.type === "starterMessageVisible") {
    if (state.status !== "morphing" || state.canvasId !== event.canvasId) return state;
    return {
      canvasId: state.canvasId,
      content: state.content,
      submissionId: state.submissionId,
      status: "settling"
    };
  }

  if (event.type === "overlaySettled") {
    if (state.status !== "settling" || state.canvasId !== event.canvasId) return state;
    return initialNewCanvasTransitionState;
  }

  if (event.type === "reset") return initialNewCanvasTransitionState;

  return state;
}

export function hasVisibleStarterMessage(
  snapshot: CanvasSnapshot | null,
  starter: { canvasId: string | null; content: string }
): boolean {
  if (!snapshot || !starter.canvasId) return false;
  if (snapshot.canvas.id !== starter.canvasId) return false;
  return snapshot.messages.some(
    message =>
      message.canvasId === starter.canvasId &&
      message.role === "user" &&
      message.status === "complete" &&
      message.content === starter.content
  );
}

export function canSettleStarterTransition({
  snapshot,
  starter
}: {
  snapshot: CanvasSnapshot | null;
  starter: { canvasId: string | null; content: string };
}): boolean {
  return hasVisibleStarterMessage(snapshot, starter);
}

export function hasRenderedStarterMessage(renderedTexts: string[], content: string): boolean {
  const normalizedContent = normalizeRenderedText(content);
  if (!normalizedContent) return false;
  return renderedTexts.some(text => normalizeRenderedText(text) === normalizedContent);
}

function normalizeRenderedText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}
