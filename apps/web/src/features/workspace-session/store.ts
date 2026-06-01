import {
  applyWorkspaceEvent,
  calculateOrganizedNodePositions,
  type CanvasEdge,
  type CanvasNode,
  type NodeMessage,
  type WorkspaceCommand,
  type WorkspaceEvent,
  type WorkspaceSnapshot
} from "@inquara/domain";
import { createStore } from "zustand/vanilla";

export type WorkspaceLeaseState = "idle" | "acquiring" | "active" | "recovering" | "blocked-stale";

export type WorkspaceLeaseMeta = {
  sessionId: string | null;
  leaseEpoch: number | null;
  displacedSeq: number | null;
  expiresAt: string | null;
};

export type WorkspaceSessionState = {
  snapshot: WorkspaceSnapshot | null;
  leaseState: WorkspaceLeaseState;
  lease: WorkspaceLeaseMeta;
  pendingClientMutationIds: string[];
  errorMessage: string | null;
  setSnapshot(snapshot: WorkspaceSnapshot | null): void;
  setLeaseState(state: WorkspaceLeaseState): void;
  setLease(meta: Partial<WorkspaceLeaseMeta>): void;
  setErrorMessage(message: string | null): void;
  markPending(clientMutationId: string): void;
  clearPending(clientMutationId: string): void;
  applyEvent(event: WorkspaceEvent): void;
  applyOptimisticCommand(command: WorkspaceCommand): void;
  reset(): void;
};

const emptyLease: WorkspaceLeaseMeta = {
  sessionId: null,
  leaseEpoch: null,
  displacedSeq: null,
  expiresAt: null
};

export function createWorkspaceSessionStore() {
  return createStore<WorkspaceSessionState>((set, get) => ({
    snapshot: null,
    leaseState: "idle",
    lease: emptyLease,
    pendingClientMutationIds: [],
    errorMessage: null,
    setSnapshot(snapshot) {
      set({ snapshot });
    },
    setLeaseState(leaseState) {
      set({ leaseState });
    },
    setLease(meta) {
      set(state => ({
        lease: {
          ...state.lease,
          ...meta
        }
      }));
    },
    setErrorMessage(errorMessage) {
      set({ errorMessage });
    },
    markPending(clientMutationId) {
      set(state => ({
        pendingClientMutationIds: state.pendingClientMutationIds.includes(clientMutationId)
          ? state.pendingClientMutationIds
          : [...state.pendingClientMutationIds, clientMutationId]
      }));
    },
    clearPending(clientMutationId) {
      set(state => ({
        pendingClientMutationIds: state.pendingClientMutationIds.filter(id => id !== clientMutationId)
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
    },
    applyOptimisticCommand(command) {
      const snapshot = get().snapshot;
      if (!snapshot) return;
      const nextSnapshot = applyOptimisticCommand(snapshot, command);
      set(state => ({
        snapshot: nextSnapshot,
        pendingClientMutationIds: state.pendingClientMutationIds.includes(command.clientMutationId)
          ? state.pendingClientMutationIds
          : [...state.pendingClientMutationIds, command.clientMutationId]
      }));
    },
    reset() {
      set({
        snapshot: null,
        leaseState: "idle",
        lease: emptyLease,
        pendingClientMutationIds: [],
        errorMessage: null
      });
    }
  }));
}

export const workspaceSessionStore = createWorkspaceSessionStore();

function applyOptimisticCommand(snapshot: WorkspaceSnapshot, command: WorkspaceCommand): WorkspaceSnapshot {
  if (command.type === "node.createAtPosition") {
    const now = new Date().toISOString();
    const node: CanvasNode = {
      id: command.nodeId,
      workspaceId: command.workspaceId,
      title: command.title ?? "New chat",
      x: command.x,
      y: command.y,
      width: 420,
      height: 520,
      collapsed: false,
      hiddenAt: null,
      deletedAt: null,
      scrollTop: 0,
      hiddenStateSnapshot: null,
      parentNodeId: null,
      sourceNodeId: null,
      sourceMessageId: null,
      sourceQuote: null,
      sourceRangeStart: null,
      sourceRangeEnd: null,
      version: 0,
      createdAt: now,
      updatedAt: now
    };
    return {
      ...snapshot,
      nodes: [...snapshot.nodes, node]
    };
  }

  if (command.type === "node.updatePosition") {
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node =>
        node.id === command.nodeId
          ? {
              ...node,
              x: command.x,
              y: command.y,
              updatedAt: new Date().toISOString()
            }
          : node
      )
    };
  }

  if (command.type === "node.organize") {
    const positions = calculateOrganizedNodePositions(snapshot.nodes);
    if (positions.size === 0) return snapshot;
    const now = new Date().toISOString();
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node => {
        const position = positions.get(node.id);
        return position
          ? {
              ...node,
              x: position.x,
              y: position.y,
              updatedAt: now
            }
          : node;
      })
    };
  }

  if (command.type === "node.updateSize") {
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node =>
        node.id === command.nodeId
          ? {
              ...node,
              width: command.width,
              height: command.height,
              updatedAt: new Date().toISOString()
            }
          : node
      )
    };
  }

  if (command.type === "node.updateScroll") {
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node =>
        node.id === command.nodeId
          ? {
              ...node,
              scrollTop: command.scrollTop
            }
          : node
      )
    };
  }

  if (command.type === "node.rename") {
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node =>
        node.id === command.nodeId
          ? {
              ...node,
              title: command.title
            }
          : node
      )
    };
  }

  if (command.type === "node.hideSubtree" || command.type === "node.deleteSubtree") {
    const hiddenAt = new Date().toISOString();
    return {
      ...snapshot,
      nodes: snapshot.nodes.map(node =>
        node.id === command.nodeId
          ? {
              ...node,
              hiddenAt,
              deletedAt: command.type === "node.deleteSubtree" ? hiddenAt : node.deletedAt
            }
          : node
      )
    };
  }

  if (command.type === "message.sendUserMessage") {
    const now = new Date().toISOString();
    const userMessage: NodeMessage = {
      id: command.userMessageId,
      workspaceId: command.workspaceId,
      nodeId: command.nodeId,
      role: "user",
      content: command.content,
      status: "complete",
      model: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
    const assistantMessage: NodeMessage = {
      id: command.assistantMessageId,
      workspaceId: command.workspaceId,
      nodeId: command.nodeId,
      role: "assistant",
      content: "",
      status: "streaming",
      model: null,
      errorMessage: null,
      createdAt: now,
      updatedAt: now
    };
    return {
      ...snapshot,
      messages: [...snapshot.messages, userMessage, assistantMessage]
    };
  }

  if (command.type === "node.createFromSelection") {
    const now = new Date().toISOString();
    const node: CanvasNode = {
      id: command.nodeId,
      workspaceId: command.workspaceId,
      title: "Follow-up",
      x: command.x,
      y: command.y,
      width: 420,
      height: 520,
      collapsed: false,
      hiddenAt: null,
      deletedAt: null,
      scrollTop: 0,
      hiddenStateSnapshot: null,
      parentNodeId: command.sourceNodeId,
      sourceNodeId: command.sourceNodeId,
      sourceMessageId: command.sourceMessageId,
      sourceQuote: command.sourceQuote,
      sourceRangeStart: command.sourceRangeStart,
      sourceRangeEnd: command.sourceRangeEnd,
      version: 0,
      createdAt: now,
      updatedAt: now
    };
    const edge: CanvasEdge = {
      id: command.edgeId,
      workspaceId: command.workspaceId,
      sourceNodeId: command.sourceNodeId,
      targetNodeId: command.nodeId,
      sourceMessageId: command.sourceMessageId,
      label: command.sourceQuote,
      createdAt: now
    };
    return {
      ...snapshot,
      nodes: [...snapshot.nodes, node],
      edges: [...snapshot.edges, edge]
    };
  }

  if (command.type === "node.restoreDeletedSubtree" || command.type === "node.restoreBranch") {
    return snapshot;
  }

  return snapshot;
}
