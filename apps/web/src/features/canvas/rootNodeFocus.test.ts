import type { CanvasNode } from "@inquara/domain";
import { describe, expect, it } from "vitest";
import { findFirstVisibleRootNode } from "./rootNodeFocus";

const baseNode: CanvasNode = {
  id: "node-1",
  workspaceId: "workspace-1",
  title: "Main chat",
  x: 120,
  y: 140,
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
  updatedAt: "2026-05-24T00:00:02.000Z"
};

function node(overrides: Partial<CanvasNode>): CanvasNode {
  return { ...baseNode, ...overrides };
}

describe("findFirstVisibleRootNode", () => {
  it("returns the earliest visible root node by creation time", () => {
    const result = findFirstVisibleRootNode([
      node({ id: "child", parentNodeId: "root-1", createdAt: "2026-05-24T00:00:00.000Z" }),
      node({ id: "root-2", createdAt: "2026-05-24T00:00:03.000Z" }),
      node({ id: "root-1", createdAt: "2026-05-24T00:00:01.000Z" })
    ]);

    expect(result?.id).toBe("root-1");
  });

  it("ignores hidden and deleted root nodes", () => {
    const result = findFirstVisibleRootNode([
      node({ id: "hidden-root", hiddenAt: "2026-05-24T00:00:04.000Z", createdAt: "2026-05-24T00:00:01.000Z" }),
      node({ id: "deleted-root", deletedAt: "2026-05-24T00:00:04.000Z", createdAt: "2026-05-24T00:00:02.000Z" }),
      node({ id: "visible-root", createdAt: "2026-05-24T00:00:03.000Z" })
    ]);

    expect(result?.id).toBe("visible-root");
  });
});
