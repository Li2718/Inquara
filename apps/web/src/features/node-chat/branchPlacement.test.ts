import { describe, expect, it } from "vitest";
import type { CanvasNode } from "@inquara/domain";
import { findFollowupNodePosition, findRestoredNodePosition } from "./branchPlacement";

function node(overrides: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id: "node-1",
    workspaceId: "workspace-1",
    title: "Node",
    x: 100,
    y: 120,
    width: 718,
    height: 966,
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

describe("findFollowupNodePosition", () => {
  it("places a default follow-up close to a resized source node", () => {
    const source = node();

    const position = findFollowupNodePosition(source, [source]);

    expect(position).toEqual({ x: 882, y: 160 });
  });

  it("uses the nearest edge-aligned slot when the ideal follow-up position is occupied", () => {
    const source = node();
    const occupied = node({ id: "occupied", x: 882, y: 160, width: 420, height: 520 });

    const position = findFollowupNodePosition(source, [source, occupied]);

    expect(position).toEqual({ x: 882, y: 692 });
  });

  it("keeps the nearest vertical slot when many other nodes are present", () => {
    const source = node();
    const occupied = node({ id: "occupied", x: 882, y: 160, width: 420, height: 520 });
    const unrelatedNodes = Array.from({ length: 20 }, (_, index) =>
      node({
        id: `unrelated-${index}`,
        x: 1_800 + index * 460,
        y: 120 + (index % 5) * 560,
        width: 420,
        height: 520
      })
    );

    const position = findFollowupNodePosition(source, [source, occupied, ...unrelatedNodes]);

    expect(position).toEqual({ x: 882, y: 692 });
  });

  it("prefers an in-view legal slot when the ideal follow-up position is outside the viewport", () => {
    const source = node({ x: 600, y: 100, width: 300, height: 300 });

    const position = findFollowupNodePosition(source, [source], {
      x: 0,
      y: 0,
      width: 900,
      height: 700
    });

    expect(position).toEqual({ x: 168, y: 140 });
  });

  it("restores a hidden node at its recorded position when that position is free", () => {
    const hidden = node({ id: "hidden", x: 900, y: 220, width: 500, height: 620, hiddenAt: "2026-05-28T00:00:00.000Z" });

    const position = findRestoredNodePosition(hidden, [node(), hidden]);

    expect(position).toEqual({ x: 900, y: 220 });
  });

  it("uses the hidden node's recorded size when restoring around occupied space", () => {
    const hidden = node({ id: "hidden", x: 900, y: 220, width: 500, height: 620, hiddenAt: "2026-05-28T00:00:00.000Z" });
    const occupied = node({ id: "occupied", x: 900, y: 220, width: 500, height: 620 });

    const position = findRestoredNodePosition(hidden, [node(), hidden, occupied]);

    expect(position).toEqual({ x: 900, y: 852 });
  });
});
