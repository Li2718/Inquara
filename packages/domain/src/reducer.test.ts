import { describe, expect, it } from "vitest";
import { applyWorkspaceEvent } from "./reducer";
import type { WorkspaceEvent } from "./events";
import type { WorkspaceSnapshot } from "./schemas";

function makeNode(
  overrides: Partial<WorkspaceSnapshot["nodes"][number]> = {}
): WorkspaceSnapshot["nodes"][number] {
  return {
    id: "node-1",
    workspaceId: "workspace-1",
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

const baseSnapshot: WorkspaceSnapshot = {
  workspace: {
    id: "workspace-1",
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
      workspaceId: "workspace-1",
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

describe("applyWorkspaceEvent", () => {
  it("adds a created node and advances the workspace version", () => {
    const event: WorkspaceEvent = {
      id: "event-1",
      type: "workspace.node.created",
      workspaceId: "workspace-1",
      version: 2,
      clientMutationId: "mutation-1",
      createdAt: "2026-05-24T00:00:02.000Z",
      node: makeNode()
    };

    const next = applyWorkspaceEvent(baseSnapshot, event);

    expect(next.workspace.version).toBe(2);
    expect(next.workspace.updatedAt).toBe(event.createdAt);
    expect(next.nodes).toHaveLength(1);
    expect(next.nodes[0]?.title).toBe("Main chat");
  });

  it("appends streamed message deltas to the matching message", () => {
    const event: WorkspaceEvent = {
      id: "event-2",
      type: "workspace.message.delta",
      workspaceId: "workspace-1",
      version: 2,
      clientMutationId: null,
      createdAt: "2026-05-24T00:00:03.000Z",
      messageId: "message-1",
      delta: "Hello"
    };

    const next = applyWorkspaceEvent(baseSnapshot, event);

    expect(next.workspace.version).toBe(2);
    expect(next.messages.find(message => message.id === "message-1")?.content).toBe("Hello");
  });

  it("applies related events that share the current workspace version", () => {
    const nodeEvent: WorkspaceEvent = {
      id: "event-node",
      type: "workspace.node.created",
      workspaceId: "workspace-1",
      version: 2,
      clientMutationId: "mutation-branch",
      createdAt: "2026-05-24T00:00:02.000Z",
      node: makeNode({ title: "Follow-up" })
    };
    const edgeEvent: WorkspaceEvent = {
      id: "event-edge",
      type: "workspace.edge.created",
      workspaceId: "workspace-1",
      version: 2,
      clientMutationId: "mutation-branch",
      createdAt: "2026-05-24T00:00:02.000Z",
      edge: {
        id: "edge-1",
        workspaceId: "workspace-1",
        sourceNodeId: "source-node",
        targetNodeId: "node-1",
        sourceMessageId: null,
        label: "selected text",
        createdAt: "2026-05-24T00:00:02.000Z"
      }
    };

    const afterNode = applyWorkspaceEvent(baseSnapshot, nodeEvent);
    const afterEdge = applyWorkspaceEvent(afterNode, edgeEvent);

    expect(afterEdge.nodes).toHaveLength(1);
    expect(afterEdge.edges).toHaveLength(1);
  });

  it("applies related node updates that share the current workspace version", () => {
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
    const snapshot: WorkspaceSnapshot = {
      ...baseSnapshot,
      nodes: [parentNode, childNode]
    };
    const firstUpdate: WorkspaceEvent = {
      id: "event-node-1",
      type: "workspace.node.updated",
      workspaceId: "workspace-1",
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
    const secondUpdate: WorkspaceEvent = {
      id: "event-node-2",
      type: "workspace.node.updated",
      workspaceId: "workspace-1",
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

    const afterFirst = applyWorkspaceEvent(snapshot, firstUpdate);
    const afterSecond = applyWorkspaceEvent(afterFirst, secondUpdate);

    expect(afterSecond.nodes.find(node => node.id === "node-1")?.hiddenAt).toBeNull();
    expect(afterSecond.nodes.find(node => node.id === "node-2")?.hiddenAt).toBeNull();
  });

  it("applies streamed message events after optimistic message creation", () => {
    const snapshot: WorkspaceSnapshot = {
      ...baseSnapshot,
      workspace: {
        ...baseSnapshot.workspace,
        version: 2
      },
      messages: [
        {
          id: "user-message-1",
          workspaceId: "workspace-1",
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
          id: "assistant-message-1",
          workspaceId: "workspace-1",
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
    const deltaEvent: WorkspaceEvent = {
      id: "event-delta",
      type: "workspace.message.delta",
      workspaceId: "workspace-1",
      version: 3,
      clientMutationId: "mutation-message",
      createdAt: "2026-05-24T00:00:04.000Z",
      messageId: "assistant-message-1",
      delta: "Hello"
    };
    const updateEvent: WorkspaceEvent = {
      id: "event-updated",
      type: "workspace.message.updated",
      workspaceId: "workspace-1",
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

    const afterDelta = applyWorkspaceEvent(snapshot, deltaEvent);
    const afterUpdate = applyWorkspaceEvent(afterDelta, updateEvent);

    expect(afterDelta.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello");
    expect(afterUpdate.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello there");
    expect(afterUpdate.messages.find(message => message.id === "assistant-message-1")?.status).toBe("complete");
  });

  it("applies same-version message updates to optimistic messages", () => {
    const snapshot: WorkspaceSnapshot = {
      ...baseSnapshot,
      workspace: {
        ...baseSnapshot.workspace,
        version: 4
      },
      messages: [
        {
          id: "assistant-message-1",
          workspaceId: "workspace-1",
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
    const event: WorkspaceEvent = {
      id: "event-updated",
      type: "workspace.message.updated",
      workspaceId: "workspace-1",
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

    const next = applyWorkspaceEvent(snapshot, event);

    expect(next.messages.find(message => message.id === "assistant-message-1")?.content).toBe("Hello there");
    expect(next.messages.find(message => message.id === "assistant-message-1")?.status).toBe("complete");
  });

  it("ignores events that are not newer than the current snapshot", () => {
    const event: WorkspaceEvent = {
      id: "event-3",
      type: "workspace.message.delta",
      workspaceId: "workspace-1",
      version: 1,
      clientMutationId: null,
      createdAt: "2026-05-24T00:00:03.000Z",
      messageId: "message-1",
      delta: "Ignored"
    };

    const next = applyWorkspaceEvent(baseSnapshot, event);

    expect(next).toBe(baseSnapshot);
  });
});
