import { describe, expect, it } from "vitest";
import {
  clearDebugPageSnapshot,
  readDebugPageSnapshotForTest,
  setDebugPageSnapshot
} from "./debugPageStore.dev";

describe("debug page store", () => {
  it("clears the current canvas snapshot only for the matching owner", () => {
    const firstOwner = Symbol("first");
    const secondOwner = Symbol("second");

    setDebugPageSnapshot(
      {
        page: "canvas",
        workspaceId: "workspace-1",
        connectionStatus: "connected",
        pendingClientMutationCount: 0,
        snapshot: null
      },
      firstOwner
    );
    setDebugPageSnapshot(
      {
        page: "canvas",
        workspaceId: "workspace-1",
        connectionStatus: "connected",
        pendingClientMutationCount: 1,
        snapshot: null
      },
      secondOwner
    );

    clearDebugPageSnapshot("workspace-1", firstOwner);

    expect(readDebugPageSnapshotForTest()).toMatchObject({
      page: "canvas",
      workspaceId: "workspace-1",
      pendingClientMutationCount: 1
    });
  });
});
