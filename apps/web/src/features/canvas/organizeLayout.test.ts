import { describe, expect, it } from "vitest";
import type { CanvasNode } from "@inquara/domain";
import { calculateOrganizedNodePositions } from "@inquara/domain";

function node(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "node-1",
    canvasId: "canvas-1",
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

describe("calculateOrganizedNodePositions", () => {
  it("keeps siblings compact and ignores hidden nodes when organizing", () => {
    const root = node({ id: "root", parentNodeId: null, x: 100, y: 100 });
    const childOne = node({ id: "child-1", parentNodeId: "root", x: 700, y: 40 });
    const hiddenChild = node({
      id: "child-2",
      parentNodeId: "root",
      x: 700,
      y: 660,
      hiddenAt: "2026-05-28T00:00:00.000Z"
    });
    const childThree = node({ id: "child-3", parentNodeId: "root", x: 700, y: 1_280 });

    const positions = calculateOrganizedNodePositions([root, childOne, hiddenChild, childThree]);

    expect(positions).toEqual(
      new Map([
        ["root", { x: 100, y: 412 }],
        ["child-1", { x: 584, y: 120 }],
        ["child-3", { x: 584, y: 704 }]
      ])
    );
  });

  it("centers a parent around the visible span of its descendants", () => {
    const root = node({ id: "root", parentNodeId: null, x: 0, y: 0 });
    const branch = node({ id: "branch", parentNodeId: "root", x: 500, y: 0 });
    const leafOne = node({ id: "leaf-1", parentNodeId: "branch", x: 1_000, y: 0 });
    const leafTwo = node({ id: "leaf-2", parentNodeId: "branch", x: 1_000, y: 900 });

    const positions = calculateOrganizedNodePositions([root, branch, leafOne, leafTwo]);

    expect(positions.get("branch")).toEqual({ x: 484, y: 412 });
    expect(positions.get("leaf-1")).toEqual({ x: 968, y: 120 });
    expect(positions.get("leaf-2")).toEqual({ x: 968, y: 704 });
  });

  it("uses node sizes when spacing descendants across levels", () => {
    const root = node({ id: "root", parentNodeId: null, x: 50, y: 0, width: 540, height: 680 });
    const branch = node({ id: "branch", parentNodeId: "root", x: 600, y: 0, width: 320, height: 360 });
    const leaf = node({ id: "leaf", parentNodeId: "branch", x: 1_000, y: 0, width: 420, height: 520 });

    const positions = calculateOrganizedNodePositions([root, branch, leaf]);

    expect(positions.get("branch")?.x).toBeGreaterThanOrEqual(positions.get("root")!.x + root.width + 64);
    expect(positions.get("leaf")?.x).toBeGreaterThanOrEqual(positions.get("branch")!.x + branch.width + 64);
  });
});
