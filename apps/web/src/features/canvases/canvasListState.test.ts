import { describe, expect, it } from "vitest";
import { upsertCanvasList } from "./canvasListState";

const canvas = (id: string, updatedAt: string) => ({
  createdAt: updatedAt,
  id,
  ownerId: "user-1",
  title: id,
  updatedAt,
  version: 0
});

describe("canvas list state", () => {
  it("places a newly created canvas at the top of the list", () => {
    const created = canvas("canvas-2", "2026-06-03T02:00:00.000Z");

    expect(upsertCanvasList([canvas("canvas-1", "2026-06-03T01:00:00.000Z")], created)).toEqual([
      created,
      canvas("canvas-1", "2026-06-03T01:00:00.000Z")
    ]);
  });

  it("replaces an existing canvas instead of duplicating it", () => {
    const updated = { ...canvas("canvas-1", "2026-06-03T03:00:00.000Z"), title: "Updated" };

    expect(upsertCanvasList([canvas("canvas-1", "2026-06-03T01:00:00.000Z")], updated)).toEqual([updated]);
  });
});
