import type { WorkspaceSnapshot } from "@inquara/domain";
import type { ConnectionStatus } from "../features/workspace-session/store";

export type DebugRootProps =
  | {
      page: "canvas";
      workspaceId: string;
      connectionStatus: ConnectionStatus;
      pendingClientMutationCount: number;
      snapshot: WorkspaceSnapshot | null;
    };
