import { describe, expect, it } from "vitest";
import { applyWorkspaceEvent } from "./reducer";
import type { WorkspaceEvent } from "./events";
import type { WorkspaceSnapshot } from "./schemas";

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
      node: {
        id: "node-1",
        workspaceId: "workspace-1",
        title: "Main chat",
        x: 120,
        y: 120,
        width: 420,
        height: 520,
        collapsed: false,
        parentNodeId: null,
        sourceNodeId: null,
        sourceMessageId: null,
        sourceQuote: null,
        sourceRangeStart: null,
        sourceRangeEnd: null,
        version: 1,
        createdAt: "2026-05-24T00:00:02.000Z",
        updatedAt: "2026-05-24T00:00:02.000Z"
      }
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
