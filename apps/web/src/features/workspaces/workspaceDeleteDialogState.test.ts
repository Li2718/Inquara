import { describe, expect, it } from "vitest";
import { getWorkspaceDeleteDialogOpeningState } from "./workspaceDeleteDialogState";

describe("workspace delete dialog state", () => {
  it("resets confirming state before opening another workspace delete dialog", () => {
    const workspace = { id: "workspace-2", title: "Second canvas" };

    expect(getWorkspaceDeleteDialogOpeningState(workspace)).toEqual({
      activeMenuId: null,
      deletingWorkspace: workspace,
      isDeleting: false
    });
  });
});
