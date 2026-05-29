import type { WorkspaceEvent, WorkspaceSnapshot } from "@inquara/domain";
import { describe, expect, it } from "vitest";
import { createWorkspaceSessionStore } from "./store";

const node = {
  id: "node-1",
  workspaceId: "workspace-1",
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
} satisfies WorkspaceSnapshot["nodes"][number];

const snapshot: WorkspaceSnapshot = {
  workspace: {
    id: "workspace-1",
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

describe("workspace session store", () => {
  it("applies events and clears acknowledged client mutations", () => {
    const store = createWorkspaceSessionStore();
    store.getState().setSnapshot(snapshot);
    store.getState().markPending("mutation-1");

    const event: WorkspaceEvent = {
      id: "event-1",
      type: "workspace.node.updated",
      workspaceId: "workspace-1",
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
});
