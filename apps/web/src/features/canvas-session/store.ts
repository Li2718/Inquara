import {
  applyCanvasEvent,
  calculateOrganizedNodePositions,
  type CanvasEdge,
  type CanvasNode,
  type NodeMessage,
  type CanvasCommand,
  type CanvasEvent,
  type CanvasSnapshot
} from "@inquara/domain";
import { createStore } from "zustand/vanilla";

export type CanvasLeaseState = "idle" | "acquiring" | "active" | "recovering" | "blocked-stale";

export type CanvasLeaseMeta = {
  sessionId: string | null;
  leaseEpoch: number | null;
  displacedSeq: number | null;
  expiresAt: string | null;
};

export type CanvasSessionMessageKey =
  | "activeElsewhereMessage"
  | "acquireFailedMessage"
  | "recoverFailedMessage"
  | "streamFailedMessage"
  | "syncFailedMessage"
  | "unstableNetworkMessage";

export type CanvasSessionState = {
  snapshot: CanvasSnapshot | null;
  leaseState: CanvasLeaseState;
  lease: CanvasLeaseMeta;
  pendingClientMutationIds: string[];
  errorMessageKey: CanvasSessionMessageKey | null;
  setSnapshot(snapshot: CanvasSnapshot | null): void;
  setLeaseState(state: CanvasLeaseState): void;
  setLease(meta: Partial<CanvasLeaseMeta>): void;
  setErrorMessageKey(messageKey: CanvasSessionMessageKey | null): void;
  markPending(clientMutationId: string): void;
  clearPending(clientMutationId: string): void;
  applyEvent(event: CanvasEvent): void;
  applyOptimisticCommand(command: CanvasCommand): void;
  reset(): void;
};

const emptyLease: CanvasLeaseMeta = {
  sessionId: null,
  leaseEpoch: null,
  displacedSeq: null,
  expiresAt: null
};

export function createCanvasSessionStore() {
  return createStore<CanvasSessionState>((set, get) => ({
    snapshot: null,
    leaseState: "idle",
    lease: emptyLease,
    pendingClientMutationIds: [],
    errorMessageKey: null,
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
    setErrorMessageKey(errorMessageKey) {
      set({ errorMessageKey });
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
        snapshot: applyCanvasEvent(snapshot, event),
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
        errorMessageKey: null
      });
    }
  }));
}

export const canvasSessionStore = createCanvasSessionStore();

function applyOptimisticCommand(snapshot: CanvasSnapshot, command: CanvasCommand): CanvasSnapshot {
  if (command.type === "node.createAtPosition") {
    const now = new Date().toISOString();
    const node: CanvasNode = {
      id: command.nodeId,
      canvasId: command.canvasId,
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
      canvasId: command.canvasId,
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
      canvasId: command.canvasId,
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
      canvasId: command.canvasId,
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
      canvasId: command.canvasId,
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
