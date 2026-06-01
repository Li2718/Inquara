import { describe, expect, it } from "vitest";
import type { CanvasNode } from "@inquara/domain";
import {
  buildHiddenSubtreeSnapshot,
  resolveRestoredSubtreePositions,
  type HiddenSubtreeSnapshot
} from "../canvas/hiddenLayout";

function node(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "node-1",
    workspaceId: "workspace-1",
    title: "Node",
    x: 100,
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
    createdAt: "2026-05-28T00:00:00.000Z",
    updatedAt: "2026-05-28T00:00:00.000Z",
    ...overrides
  };
}

describe("buildHiddenSubtreeSnapshot", () => {
  it("stores each hidden node relative to its direct parent", () => {
    const parent = node({ id: "parent", x: 100, y: 100, parentNodeId: null });
    const branch = node({ id: "branch", x: 620, y: 180, parentNodeId: "parent" });
    const leaf = node({ id: "leaf", x: 1_140, y: 260, parentNodeId: "branch" });

    const snapshot = buildHiddenSubtreeSnapshot([parent, branch, leaf], "branch", 240);

    expect(snapshot).toEqual<HiddenSubtreeSnapshot>({
      branch: { hiddenAt: null, offsetX: 520, offsetY: 80, scrollTop: 240 },
      leaf: { hiddenAt: null, offsetX: 520, offsetY: 80, scrollTop: 0 }
    });
  });
});

describe("resolveRestoredSubtreePositions", () => {
  it("rebuilds the whole hidden subtree from the parent's current position", () => {
    const root = node({ id: "root", x: 320, y: 412, parentNodeId: null });
    const branch = node({
      id: "branch",
      x: 620,
      y: 180,
      parentNodeId: "root",
      hiddenAt: "2026-05-28T00:00:00.000Z"
    });
    const child = node({
      id: "child",
      x: 1_140,
      y: 260,
      parentNodeId: "branch",
      hiddenAt: "2026-05-28T00:00:00.000Z"
    });
    const grandchild = node({
      id: "grandchild",
      x: 1_660,
      y: 340,
      parentNodeId: "child",
      hiddenAt: "2026-05-28T00:00:00.000Z"
    });

    const positions = resolveRestoredSubtreePositions(
      [root, branch, child, grandchild],
      "branch",
      {
        branch: { hiddenAt: null, offsetX: 484, offsetY: 40, scrollTop: 120 },
        child: { hiddenAt: null, offsetX: 484, offsetY: 48, scrollTop: 80 },
        grandchild: { hiddenAt: null, offsetX: 484, offsetY: 56, scrollTop: 32 }
      }
    );

    expect(positions).toEqual(
      new Map([
        ["branch", { x: 804, y: 452 }],
        ["child", { x: 1_288, y: 500 }],
        ["grandchild", { x: 1_772, y: 556 }]
      ])
    );
  });
});
