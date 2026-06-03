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
  it("updates the canvas title and version", () => {
    const event: CanvasEvent = {
      id: "event-canvas-updated",
      type: "canvas.updated",
      canvasId: "canvas-1",
      version: 2,
      clientMutationId: null,
      createdAt: "2026-05-24T00:00:02.000Z",
      canvas: {
        ...baseSnapshot.canvas,
        title: "Generated title",
        version: 2,
        updatedAt: "2026-05-24T00:00:02.000Z"
      }
    };

    const next = applyCanvasEvent(baseSnapshot, event);

    expect(next.canvas.title).toBe("Generated title");
    expect(next.canvas.version).toBe(2);
  });

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

  it("applies streamed message events after optimistic message creation", () => {
    const snapshot: CanvasSnapshot = {
      ...baseSnapshot,
      canvas: {
        ...baseSnapshot.canvas,
        version: 2
      },
      messages: [
        {
          canvasId: "canvas-1",
          id: "user-message-1",
          nodeId: "node-1",
          role: "user",
          content: "First question",
          status: "complete",
          model: null,
          errorMessage: null,
          createdAt: "2026-05-24T00:00:03.000Z",
          updatedAt: "2026-05-24T00:00:03.000Z"
        },
        {
          canvasId: "canvas-1",
          id: "assistant-message-1",
          nodeId: "node-1",
          role: "assistant",
          content: "",
          status: "streaming",
          model: null,
          errorMessage: null,
          createdAt: "2026-05-24T00:00:03.000Z",
          updatedAt: "2026-05-24T00:00:03.000Z"
        }
      ]
    };
    const deltaEvent: CanvasEvent = {
      canvasId: "canvas-1",
      id: "event-delta",
      type: "canvas.message.delta",
      version: 3,
      clientMutationId: "mutation-message",
      createdAt: "2026-05-24T00:00:04.000Z",
      messageId: "assistant-message-1",
      delta: "Hello"
    };
    const updateEvent: CanvasEvent = {
      canvasId: "canvas-1",
      id: "event-updated",
      type: "canvas.message.updated",
      version: 4,
      clientMutationId: "mutation-message",
      createdAt: "2026-05-24T00:00:05.000Z",
      message: {
        ...snapshot.messages[1]!,
        content: "Hello there",
        status: "complete",
        model: "fake",
        updatedAt: "2026-05-24T00:00:05.000Z"
      }
    };

    const afterDelta = applyCanvasEvent(snapshot, deltaEvent);
    const afterUpdate = applyCanvasEvent(afterDelta, updateEvent);

    expect(afterDelta.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello");
    expect(afterUpdate.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello there");
    expect(afterUpdate.messages.find(message => message.id === "assistant-message-1")?.status).toBe("complete");
  });

  it("applies same-version message updates to optimistic messages", () => {
    const snapshot: CanvasSnapshot = {
      ...baseSnapshot,
      canvas: {
        ...baseSnapshot.canvas,
        version: 4
      },
      messages: [
        {
          canvasId: "canvas-1",
          id: "assistant-message-1",
          nodeId: "node-1",
          role: "assistant",
          content: "Hello",
          status: "streaming",
          model: null,
          errorMessage: null,
          createdAt: "2026-05-24T00:00:03.000Z",
          updatedAt: "2026-05-24T00:00:03.000Z"
        }
      ]
    };
    const event: CanvasEvent = {
      canvasId: "canvas-1",
      id: "event-updated",
      type: "canvas.message.updated",
      version: 4,
      clientMutationId: "mutation-message",
      createdAt: "2026-05-24T00:00:05.000Z",
      message: {
        ...snapshot.messages[0]!,
        content: "Hello there",
        status: "complete",
        model: "fake",
        updatedAt: "2026-05-24T00:00:05.000Z"
      }
    };

    const next = applyCanvasEvent(snapshot, event);

    expect(next.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello there");
    expect(next.messages.find(message => message.id === "assistant-message-1")?.status).toBe("complete");
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
