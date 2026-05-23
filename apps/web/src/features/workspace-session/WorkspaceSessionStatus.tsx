"use client";

import { useWorkspaceSession } from "./WorkspaceSessionProvider";

export function WorkspaceSessionStatus() {
  const { state } = useWorkspaceSession();
  const snapshot = state.snapshot;

  return (
    <div className="session-status">
      <span>Connection: {state.connectionStatus}</span>
      <span>Nodes: {snapshot?.nodes.length ?? 0}</span>
      <span>Messages: {snapshot?.messages.length ?? 0}</span>
      <span>Pending: {state.pendingClientMutationIds.length}</span>
    </div>
  );
}
