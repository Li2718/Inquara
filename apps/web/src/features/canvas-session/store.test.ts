import type { CanvasEvent, CanvasSnapshot } from "@inquara/domain";
import { describe, expect, it } from "vitest";
import { createCanvasSessionStore } from "./store";

const node = {
  id: "node-1",
  canvasId: "canvas-1",
  title: "Main chat",
  x: 0,
  y: 0,
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
  createdAt: "2026-05-24T00:00:00.000Z",
  updatedAt: "2026-05-24T00:00:00.000Z"
} satisfies CanvasSnapshot["nodes"][number];

const snapshot: CanvasSnapshot = {
  canvas: {
    id: "canvas-1",
    ownerId: "user-1",
    title: "Canvas",
    version: 0,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z"
  },
  nodes: [node],
  edges: [],
  messages: []
};

describe("canvas session store", () => {
  it("applies canvas title update events", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyEvent({
      id: "event-canvas-title",
      type: "canvas.updated",
      canvasId: "canvas-1",
      version: 1,
      clientMutationId: null,
      createdAt: "2026-05-24T00:01:00.000Z",
      canvas: {
        ...snapshot.canvas,
        title: "Generated title",
        version: 1,
        updatedAt: "2026-05-24T00:01:00.000Z"
      }
    });

    expect(store.getState().snapshot?.canvas.title).toBe("Generated title");
  });

  it("applies events and clears acknowledged client mutations", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);
    store.getState().setLeaseState("active");
    store.getState().markPending("mutation-1");

    const event: CanvasEvent = {
      id: "event-1",
      type: "canvas.node.updated",
      canvasId: "canvas-1",
      version: 1,
      clientMutationId: "mutation-1",
      createdAt: "2026-05-24T00:01:00.000Z",
      node: {
        ...node,
        x: 90,
        y: 110,
        version: 1,
        updatedAt: "2026-05-24T00:01:00.000Z"
      }
    };

    store.getState().applyEvent(event);

    expect(store.getState().snapshot?.nodes[0]?.x).toBe(90);
    expect(store.getState().pendingClientMutationIds).toEqual([]);
  });

  it("applies optimistic node movement before the server event arrives", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "node.updatePosition",
      clientMutationId: "mutation-optimistic-position",
      canvasId: "canvas-1",
      nodeId: "node-1",
      x: 180,
      y: 220
    });

    expect(store.getState().snapshot?.nodes[0]?.x).toBe(180);
    expect(store.getState().snapshot?.nodes[0]?.y).toBe(220);
    expect(store.getState().pendingClientMutationIds).toEqual(["mutation-optimistic-position"]);
  });

  it("applies optimistic canvas organization before the server events arrive", () => {
    const store = createCanvasSessionStore();
    const child = {
      ...node,
      id: "node-2",
      parentNodeId: "node-1",
      x: 900,
      y: 900,
      createdAt: "2026-05-24T00:01:00.000Z",
      updatedAt: "2026-05-24T00:01:00.000Z"
    };
    store.getState().setSnapshot({
      ...snapshot,
      nodes: [node, child]
    });

    store.getState().applyOptimisticCommand({
      type: "node.organize",
      clientMutationId: "mutation-organize",
      canvasId: "canvas-1"
    });

    const nodes = store.getState().snapshot?.nodes ?? [];
    expect(nodes.find(candidate => candidate.id === "node-1")).toMatchObject({ x: 0, y: 120 });
    expect(nodes.find(candidate => candidate.id === "node-2")).toMatchObject({ x: 484, y: 120 });
    expect(store.getState().pendingClientMutationIds).toEqual(["mutation-organize"]);
  });

  it("uses the first root question as the optimistic node and canvas title", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "message.sendUserMessage",
      clientMutationId: "mutation-first-message",
      canvasId: "canvas-1",
      nodeId: "node-1",
      userMessageId: "message-user-1",
      assistantMessageId: "message-assistant-1",
      content: "How should this canvas be titled?"
    });

    expect(store.getState().snapshot?.canvas.title).toBe("How should this canvas be titled?");
    expect(store.getState().snapshot?.nodes[0]?.title).toBe("How should this canvas be titled?");
    expect(store.getState().pendingClientMutationIds).toEqual(["mutation-first-message"]);
  });

  it("lets generated title events replace the optimistic first-question title", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "message.sendUserMessage",
      clientMutationId: "mutation-first-message",
      canvasId: "canvas-1",
      nodeId: "node-1",
      userMessageId: "message-user-1",
      assistantMessageId: "message-assistant-1",
      content: "How should this canvas be titled?"
    });
    store.getState().applyEvent({
      id: "event-generated-node-title",
      type: "canvas.node.updated",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: null,
      createdAt: "2026-05-24T00:02:00.000Z",
      node: {
        ...node,
        title: "Generated concise title",
        version: 1,
        updatedAt: "2026-05-24T00:02:00.000Z"
      }
    });

    expect(store.getState().snapshot?.nodes[0]?.title).toBe("Generated concise title");
  });

  it("keeps message submissions pending until the assistant message reaches a terminal state", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "message.sendUserMessage",
      clientMutationId: "mutation-first-message",
      canvasId: "canvas-1",
      nodeId: "node-1",
      userMessageId: "message-user-1",
      assistantMessageId: "message-assistant-1",
      content: "How should this canvas be titled?"
    });
    store.getState().applyEvent({
      id: "event-fallback-title",
      type: "canvas.node.updated",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-first-message",
      createdAt: "2026-05-24T00:02:00.000Z",
      node: {
        ...node,
        title: "How should this canvas be titled?",
        version: 1,
        updatedAt: "2026-05-24T00:02:00.000Z"
      }
    });

    expect(store.getState().pendingClientMutationIds).toEqual(["mutation-first-message"]);

    store.getState().applyEvent({
      id: "event-message-complete",
      type: "canvas.message.updated",
      canvasId: "canvas-1",
      version: 3,
      clientMutationId: "mutation-first-message",
      createdAt: "2026-05-24T00:03:00.000Z",
      message: {
        canvasId: "canvas-1",
        id: "message-assistant-1",
        nodeId: "node-1",
        role: "assistant",
        content: "Done",
        status: "complete",
        model: "fake",
        errorMessage: null,
        createdAt: "2026-05-24T00:01:00.000Z",
        updatedAt: "2026-05-24T00:03:00.000Z"
      }
    });

    expect(store.getState().pendingClientMutationIds).toEqual([]);
  });

  it("does not let stale snapshots erase a pending optimistic first message", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "message.sendUserMessage",
      clientMutationId: "mutation-first-message",
      canvasId: "canvas-1",
      nodeId: "node-1",
      userMessageId: "message-user-1",
      assistantMessageId: "message-assistant-1",
      content: "How should this canvas be titled?"
    });
    store.getState().setSnapshot(snapshot);

    expect(store.getState().snapshot?.nodes[0]?.title).toBe("How should this canvas be titled?");
    expect(store.getState().snapshot?.messages.map(message => message.id)).toEqual([
      "message-user-1",
      "message-assistant-1"
    ]);
  });

  it("uses selected text as the optimistic follow-up node title", () => {
    const store = createCanvasSessionStore();
    store.getState().setSnapshot(snapshot);

    store.getState().applyOptimisticCommand({
      type: "node.createFromSelection",
      clientMutationId: "mutation-follow-up",
      canvasId: "canvas-1",
      nodeId: "node-follow-up",
      edgeId: "edge-follow-up",
      sourceNodeId: "node-1",
      sourceMessageId: "message-1",
      sourceQuote: "selected text for the follow-up",
      sourceRangeStart: 0,
      sourceRangeEnd: 31,
      x: 480,
      y: 120
    });

    expect(store.getState().snapshot?.nodes.find(candidate => candidate.id === "node-follow-up")?.title).toBe(
      "selected text for the follow-up"
    );
  });
});
