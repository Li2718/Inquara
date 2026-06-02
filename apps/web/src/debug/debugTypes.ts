import type { CanvasSnapshot } from "@inquara/domain";
import type { CanvasLeaseState } from "../features/canvas-session/store";

export type DebugRootProps = {
  page: "global";
};

export type CanvasDebugSnapshot = {
  page: "canvas";
  canvasId: string;
  leaseState: CanvasLeaseState;
  pendingClientMutationCount: number;
  snapshot: CanvasSnapshot | null;
};

export type DebugCanvasSourceProps = CanvasDebugSnapshot;

export type DebugPageSnapshot = DebugRootProps | CanvasDebugSnapshot;
