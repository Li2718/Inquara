import { describe, expect, it } from "vitest";
import { upsertWorkspaceList } from "./workspaceListState";

const workspace = (id: string, updatedAt: string) => ({
  createdAt: updatedAt,
  id,
  ownerId: "user-1",
  title: id,
  updatedAt,
  version: 0
});

describe("workspace list state", () => {
  it("places a newly created workspace at the top of the list", () => {
    const created = workspace("workspace-2", "2026-06-03T02:00:00.000Z");

    expect(upsertWorkspaceList([workspace("workspace-1", "2026-06-03T01:00:00.000Z")], created)).toEqual([
      created,
      workspace("workspace-1", "2026-06-03T01:00:00.000Z")
    ]);
  });

  it("replaces an existing workspace instead of duplicating it", () => {
    const updated = { ...workspace("workspace-1", "2026-06-03T03:00:00.000Z"), title: "Updated" };

    expect(upsertWorkspaceList([workspace("workspace-1", "2026-06-03T01:00:00.000Z")], updated)).toEqual([updated]);
  });
});
