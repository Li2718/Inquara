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
});
