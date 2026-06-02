import { describe, expect, it } from "vitest";
import { getWorkspaceLeaseActionLabelKey, shouldBlockWorkspaceInteraction, shouldShowLeaseAction } from "./WorkspaceLeaseBlocker";

describe("WorkspaceLeaseBlocker", () => {
  it("shows a reconnect action while automatic recovery is in progress", () => {
    expect(shouldShowLeaseAction()).toBe(true);
    expect(getWorkspaceLeaseActionLabelKey({ isRecovering: true })).toBe("reconnect");
  });

  it("shows a takeover action when another client blocks editing", () => {
    expect(shouldShowLeaseAction()).toBe(true);
    expect(getWorkspaceLeaseActionLabelKey({ isRecovering: false })).toBe("takeOver");
  });

  it("blocks blocked-stale workspaces because the visible canvas may be outdated", () => {
    expect(shouldBlockWorkspaceInteraction({ isRecovering: false })).toBe(true);
  });

  it("keeps recovering workspaces browseable while reconnecting", () => {
    expect(shouldBlockWorkspaceInteraction({ isRecovering: true })).toBe(false);
  });
});
