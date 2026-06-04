import { describe, expect, it } from "vitest";
import type { CanvasSnapshot } from "@inquara/domain";
import { selectCanvasDisplaySnapshot } from "./canvasDisplaySnapshot";

describe("canvas display snapshot", () => {
  it("switches directly to a matching cached target snapshot", () => {
    const current = snapshot("canvas-1");
    const cached = snapshot("canvas-2");

    expect(
      selectCanvasDisplaySnapshot({
        cachedSnapshot: cached,
        currentDisplaySnapshot: current,
        targetCanvasId: "canvas-2"
      })
    ).toBe(cached);
  });

  it("keeps the current displayed snapshot when the target has no cache", () => {
    const current = snapshot("canvas-1");

    expect(
      selectCanvasDisplaySnapshot({
        cachedSnapshot: null,
        currentDisplaySnapshot: current,
        targetCanvasId: "canvas-2"
      })
    ).toBe(current);
  });
});

function snapshot(canvasId: string): CanvasSnapshot {
  return {
    canvas: {
      createdAt: "2026-06-01T00:00:00.000Z",
      id: canvasId,
      ownerId: "user-1",
      title: canvasId,
      updatedAt: "2026-06-01T00:00:00.000Z",
      version: 0
    },
    edges: [],
    messages: [],
    nodes: []
  };
}
