import type { WorkspaceSnapshot } from "@inquara/domain";
import type { ConnectionStatus } from "../features/workspace-session/store";

export type DebugRootProps = {
  page: "global";
};

export type CanvasDebugSnapshot = {
  page: "canvas";
  workspaceId: string;
  connectionStatus: ConnectionStatus;
  pendingClientMutationCount: number;
  snapshot: WorkspaceSnapshot | null;
};

export type DebugCanvasSourceProps = CanvasDebugSnapshot;

export type DebugPageSnapshot = DebugRootProps | CanvasDebugSnapshot;
