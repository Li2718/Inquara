import { applyWorkspaceEvent, type WorkspaceEvent, type WorkspaceSnapshot } from "@inquara/domain";
import { createStore } from "zustand/vanilla";

export type ConnectionStatus = "idle" | "connecting" | "connected" | "disconnected";

export type WorkspaceSessionState = {
  snapshot: WorkspaceSnapshot | null;
  connectionStatus: ConnectionStatus;
  pendingClientMutationIds: string[];
  setSnapshot(snapshot: WorkspaceSnapshot): void;
  setConnectionStatus(status: ConnectionStatus): void;
  markPending(clientMutationId: string): void;
  applyEvent(event: WorkspaceEvent): void;
};

export function createWorkspaceSessionStore() {
  return createStore<WorkspaceSessionState>((set, get) => ({
    snapshot: null,
    connectionStatus: "idle",
    pendingClientMutationIds: [],
    setSnapshot(snapshot) {
      set({ snapshot });
    },
    setConnectionStatus(connectionStatus) {
      set({ connectionStatus });
    },
    markPending(clientMutationId) {
      set(state => ({
        pendingClientMutationIds: state.pendingClientMutationIds.includes(clientMutationId)
          ? state.pendingClientMutationIds
          : [...state.pendingClientMutationIds, clientMutationId]
      }));
    },
    applyEvent(event) {
      const snapshot = get().snapshot;
      if (!snapshot) return;
      set(state => ({
        snapshot: applyWorkspaceEvent(snapshot, event),
        pendingClientMutationIds: event.clientMutationId
          ? state.pendingClientMutationIds.filter(id => id !== event.clientMutationId)
          : state.pendingClientMutationIds
      }));
    }
  }));
}

export const workspaceSessionStore = createWorkspaceSessionStore();
