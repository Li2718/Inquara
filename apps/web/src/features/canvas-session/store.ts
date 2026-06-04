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
  displaySnapshot: CanvasSnapshot | null;
  leaseState: CanvasLeaseState;
  lease: CanvasLeaseMeta;
  pendingClientMutationIds: string[];
  pendingClientMutationTypes: Record<string, CanvasCommand["type"]>;
  errorMessageKey: CanvasSessionMessageKey | null;
  setSnapshot(snapshot: CanvasSnapshot | null): void;
  setDisplaySnapshot(snapshot: CanvasSnapshot | null): void;
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
    displaySnapshot: null,
    leaseState: "idle",
    lease: emptyLease,
    pendingClientMutationIds: [],
    pendingClientMutationTypes: {},
    errorMessageKey: null,
    setSnapshot(snapshot) {
      set(state => {
        const nextSnapshot = preservePendingOptimisticState(snapshot, state.snapshot, state.pendingClientMutationIds);
        return { snapshot: nextSnapshot };
      });
    },
    setDisplaySnapshot(displaySnapshot) {
      set({ displaySnapshot });
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
        pendingClientMutationIds: state.pendingClientMutationIds.filter(id => id !== clientMutationId),
        pendingClientMutationTypes: omitMutationType(state.pendingClientMutationTypes, clientMutationId)
      }));
    },
    applyEvent(event) {
      const snapshot = get().snapshot;
      if (!snapshot) return;
      set(state => {
        const shouldClearPending = shouldClearPendingMutation(event, state.pendingClientMutationTypes);
        const nextSnapshot = applyCanvasEvent(snapshot, event);
        return {
          displaySnapshot:
            state.displaySnapshot?.canvas.id === nextSnapshot.canvas.id ? nextSnapshot : state.displaySnapshot,
          snapshot: nextSnapshot,
          pendingClientMutationIds:
            event.clientMutationId && shouldClearPending
              ? state.pendingClientMutationIds.filter(id => id !== event.clientMutationId)
              : state.pendingClientMutationIds,
          pendingClientMutationTypes:
            event.clientMutationId && shouldClearPending
              ? omitMutationType(state.pendingClientMutationTypes, event.clientMutationId)
              : state.pendingClientMutationTypes
        };
      });
    },
    applyOptimisticCommand(command) {
      const snapshot = get().snapshot;
      if (!snapshot) return;
      const nextSnapshot = applyOptimisticCommand(snapshot, command);
      set(state => ({
        displaySnapshot:
          state.displaySnapshot?.canvas.id === nextSnapshot.canvas.id ? nextSnapshot : state.displaySnapshot,
        snapshot: nextSnapshot,
        pendingClientMutationIds: state.pendingClientMutationIds.includes(command.clientMutationId)
          ? state.pendingClientMutationIds
          : [...state.pendingClientMutationIds, command.clientMutationId],
        pendingClientMutationTypes: {
          ...state.pendingClientMutationTypes,
          [command.clientMutationId]: command.type
        }
      }));
    },
    reset() {
      set({
        snapshot: null,
        displaySnapshot: null,
        leaseState: "idle",
        lease: emptyLease,
        pendingClientMutationIds: [],
        pendingClientMutationTypes: {},
        errorMessageKey: null
      });
    }
  }));
}

export const canvasSessionStore = createCanvasSessionStore();

function shouldClearPendingMutation(
  event: CanvasEvent,
  pendingTypes: Record<string, CanvasCommand["type"]>
): boolean {
  if (!event.clientMutationId) return false;
  const pendingType = pendingTypes[event.clientMutationId];
  if (pendingType !== "message.sendUserMessage") return true;
  return event.type === "canvas.message.updated" || event.type === "canvas.message.failed";
}

function omitMutationType(
  pendingTypes: Record<string, CanvasCommand["type"]>,
  clientMutationId: string
): Record<string, CanvasCommand["type"]> {
  if (!(clientMutationId in pendingTypes)) return pendingTypes;
  const { [clientMutationId]: _removed, ...rest } = pendingTypes;
  return rest;
}

function preservePendingOptimisticState(
  incomingSnapshot: CanvasSnapshot | null,
  currentSnapshot: CanvasSnapshot | null,
  pendingClientMutationIds: string[]
): CanvasSnapshot | null {
  if (!incomingSnapshot || !currentSnapshot) return incomingSnapshot;
  if (incomingSnapshot.canvas.id !== currentSnapshot.canvas.id) return incomingSnapshot;
  if (pendingClientMutationIds.length === 0) return incomingSnapshot;

  const incomingMessageIds = new Set(incomingSnapshot.messages.map(message => message.id));
  const preservedMessages = currentSnapshot.messages.filter(message => !incomingMessageIds.has(message.id));
  if (preservedMessages.length === 0) return incomingSnapshot;
  const nextSnapshot = {
    ...incomingSnapshot,
    messages: [...incomingSnapshot.messages, ...preservedMessages]
  };

  const pendingNodeIds = new Set(
    currentSnapshot.messages
      .filter(message => nextSnapshot.messages.some(candidate => candidate.id === message.id))
      .map(message => message.nodeId)
  );
  if (pendingNodeIds.size === 0) return nextSnapshot;

  return {
    ...nextSnapshot,
    canvas: currentSnapshot.canvas.updatedAt > nextSnapshot.canvas.updatedAt ? currentSnapshot.canvas : nextSnapshot.canvas,
    nodes: nextSnapshot.nodes.map(node => {
      if (!pendingNodeIds.has(node.id)) return node;
      const currentNode = currentSnapshot.nodes.find(candidate => candidate.id === node.id);
      return currentNode && currentNode.updatedAt > node.updatedAt ? currentNode : node;
    })
  };
}

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
    const targetNode = snapshot.nodes.find(node => node.id === command.nodeId);
    const existingUserMessageCount = snapshot.messages.filter(
      message => message.nodeId === command.nodeId && message.role === "user"
    ).length;
    const shouldApplyInitialTitle =
      Boolean(targetNode) &&
      existingUserMessageCount === 0 &&
      !targetNode?.parentNodeId &&
      !targetNode?.sourceQuote;
    const fallbackTitle = truncateTitle(command.content);
    const rootNode = snapshot.nodes
      .filter(node => !node.parentNodeId && !node.deletedAt)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
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
      canvas:
        shouldApplyInitialTitle && rootNode?.id === command.nodeId
          ? {
              ...snapshot.canvas,
              title: fallbackTitle,
              updatedAt: now
            }
          : snapshot.canvas,
      nodes: shouldApplyInitialTitle
        ? snapshot.nodes.map(node =>
            node.id === command.nodeId
              ? {
                  ...node,
                  title: fallbackTitle,
                  updatedAt: now
                }
              : node
          )
        : snapshot.nodes,
      messages: [...snapshot.messages, userMessage, assistantMessage]
    };
  }

  if (command.type === "node.createFromSelection") {
    const now = new Date().toISOString();
    const node: CanvasNode = {
      id: command.nodeId,
      canvasId: command.canvasId,
      title: truncateTitle(command.sourceQuote),
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

function truncateTitle(value: string, maxLength = 80): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (normalized.length <= maxLength) return normalized || "Follow-up";
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}
