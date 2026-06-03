import type { WorkspaceSnapshot } from "@inquara/domain";

export type NewCanvasTransitionState =
  | {
      content: "";
      status: "idle";
      workspaceId: null;
    }
  | {
      content: string;
      status: "morphing";
      workspaceId: string;
    };

export type NewCanvasTransitionEvent =
  | {
      content: string;
      type: "submitted";
      workspaceId: string;
    }
  | {
      type: "starterMessageVisible";
      workspaceId: string;
    }
  | {
      type: "reset";
    };

export const initialNewCanvasTransitionState: NewCanvasTransitionState = {
  content: "",
  status: "idle",
  workspaceId: null
};

export function advanceNewCanvasTransition(
  state: NewCanvasTransitionState,
  event: NewCanvasTransitionEvent
): NewCanvasTransitionState {
  if (event.type === "submitted") {
    return {
      content: event.content,
      status: "morphing",
      workspaceId: event.workspaceId
    };
  }

  if (event.type === "starterMessageVisible") {
    if (state.status !== "morphing" || state.workspaceId !== event.workspaceId) return state;
    return initialNewCanvasTransitionState;
  }

  if (event.type === "reset") return initialNewCanvasTransitionState;

  return state;
}

export function hasVisibleStarterMessage(
  snapshot: WorkspaceSnapshot | null,
  starter: { content: string; workspaceId: string | null }
): boolean {
  if (!snapshot || !starter.workspaceId) return false;
  if (snapshot.workspace.id !== starter.workspaceId) return false;
  return snapshot.messages.some(
    message =>
      message.workspaceId === starter.workspaceId &&
      message.role === "user" &&
      message.status === "complete" &&
      message.content === starter.content
  );
}
