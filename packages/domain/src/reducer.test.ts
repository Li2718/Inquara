import { describe, expect, it } from "vitest";
import { applyCanvasEvent } from "./reducer";
import type { CanvasEvent } from "./events";
import type { CanvasSnapshot } from "./schemas";

function makeNode(
  overrides: Partial<CanvasSnapshot["nodes"][number]> = {}
): CanvasSnapshot["nodes"][number] {
  return {
    id: "node-1",
    canvasId: "canvas-1",
    title: "Main chat",
    x: 120,
    y: 120,
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
    version: 1,
    createdAt: "2026-05-24T00:00:02.000Z",
    updatedAt: "2026-05-24T00:00:02.000Z",
    ...overrides
  };
}

const baseSnapshot: CanvasSnapshot = {
  canvas: {
    id: "canvas-1",
    ownerId: "user-1",
    title: "Canvas",
    version: 1,
    createdAt: "2026-05-24T00:00:00.000Z",
    updatedAt: "2026-05-24T00:00:00.000Z"
  },
  nodes: [],
  edges: [],
  messages: [
    {
      id: "message-1",
      canvasId: "canvas-1",
      nodeId: "node-1",
      role: "assistant",
      content: "",
      status: "streaming",
      model: "fake",
      errorMessage: null,
      createdAt: "2026-05-24T00:00:01.000Z",
      updatedAt: "2026-05-24T00:00:01.000Z"
    }
  ]
};

describe("applyCanvasEvent", () => {
  it("adds a created node and advances the canvas version", () => {
    const event: CanvasEvent = {
      id: "event-1",
      type: "canvas.node.created",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-1",
      createdAt: "2026-05-24T00:00:02.000Z",
      node: makeNode()
    };

    const next = applyCanvasEvent(baseSnapshot, event);

    expect(next.canvas.version).toBe(2);
    expect(next.canvas.updatedAt).toBe(event.createdAt);
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0]?.title).toBe("Main chat");
  });

  it("appends streamed message deltas to the matching message", () => {
    const event: CanvasEvent = {
      id: "event-2",
      type: "canvas.message.delta",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: null,
      createdAt: "2026-05-24T00:00:03.000Z",
      messageId: "message-1",
      delta: "Hello"
    };

    const next = applyCanvasEvent(baseSnapshot, event);

    expect(next.canvas.version).toBe(2);
    expect(next.messages.find(message => message.id === "message-1")?.content).toBe("Hello");
  });

  it("applies related events that share the current canvas version", () => {
    const nodeEvent: CanvasEvent = {
      id: "event-node",
      type: "canvas.node.created",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-branch",
      createdAt: "2026-05-24T00:00:02.000Z",
      node: makeNode({ title: "Follow-up" })
    };
    const edgeEvent: CanvasEvent = {
      id: "event-edge",
      type: "canvas.edge.created",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-branch",
      createdAt: "2026-05-24T00:00:02.000Z",
      edge: {
        id: "edge-1",
        canvasId: "canvas-1",
        sourceNodeId: "source-node",
        targetNodeId: "node-1",
        sourceMessageId: null,
        label: "selected text",
        createdAt: "2026-05-24T00:00:02.000Z"
      }
    };

    const afterNode = applyCanvasEvent(baseSnapshot, nodeEvent);
    const afterEdge = applyCanvasEvent(afterNode, edgeEvent);

    expect(afterEdge.nodes).toHaveLength(1);
    expect(afterEdge.edges).toHaveLength(1);
  });

  it("applies related node updates that share the current canvas version", () => {
    const parentNode = makeNode({
      id: "node-1",
      title: "Parent",
      hiddenAt: "2026-05-24T00:00:04.000Z",
      updatedAt: "2026-05-24T00:00:04.000Z"
    });
    const childNode = makeNode({
      id: "node-2",
      title: "Child",
      x: 660,
      hiddenAt: "2026-05-24T00:00:04.000Z",
      parentNodeId: "node-1",
      sourceNodeId: "node-1",
      sourceMessageId: "message-1",
      sourceQuote: "selected text",
      sourceRangeStart: 0,
      sourceRangeEnd: 13,
      createdAt: "2026-05-24T00:00:03.000Z",
      updatedAt: "2026-05-24T00:00:04.000Z"
    });
    const snapshot: CanvasSnapshot = {
      ...baseSnapshot,
      nodes: [parentNode, childNode]
    };
    const firstUpdate: CanvasEvent = {
      id: "event-node-1",
      type: "canvas.node.updated",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-restore",
      createdAt: "2026-05-24T00:00:05.000Z",
      node: {
        ...parentNode,
        hiddenAt: null,
        updatedAt: "2026-05-24T00:00:05.000Z",
        version: 2
      }
    };
    const secondUpdate: CanvasEvent = {
      id: "event-node-2",
      type: "canvas.node.updated",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: "mutation-restore",
      createdAt: "2026-05-24T00:00:05.000Z",
      node: {
        ...childNode,
        hiddenAt: null,
        updatedAt: "2026-05-24T00:00:05.000Z",
        version: 2
      }
    };

    const afterFirst = applyCanvasEvent(snapshot, firstUpdate);
    const afterSecond = applyCanvasEvent(afterFirst, secondUpdate);

    expect(afterSecond.nodes.find(node => node.id === "node-1")?.hiddenAt).toBeNull();
    expect(afterSecond.nodes.find(node => node.id === "node-2")?.hiddenAt).toBeNull();
  });

  it("ignores events that are not newer than the current snapshot", () => {
    const event: CanvasEvent = {
      id: "event-3",
      type: "canvas.message.delta",
      canvasId: "canvas-1",
      version: 1,
      clientMutationId: null,
      createdAt: "2026-05-24T00:00:03.000Z",
      messageId: "message-1",
      delta: "Ignored"
    };

    const next = applyCanvasEvent(baseSnapshot, event);

    expect(next).toBe(baseSnapshot);
  });
});
