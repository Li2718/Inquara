import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelPendingWorkspaceLeaseRelease, scheduleWorkspaceLeaseRelease } from "./leaseReleaseScheduler";

describe("lease release scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("cancels a pending release when the same workspace remounts immediately", async () => {
    const release = vi.fn();

    scheduleWorkspaceLeaseRelease("workspace-1", release, 250);
    cancelPendingWorkspaceLeaseRelease("workspace-1");
    await vi.advanceTimersByTimeAsync(250);

    expect(release).not.toHaveBeenCalled();
  });

  it("releases the workspace when the unmount is final", async () => {
    const release = vi.fn();

    scheduleWorkspaceLeaseRelease("workspace-1", release, 250);
    await vi.advanceTimersByTimeAsync(250);

    expect(release).toHaveBeenCalledTimes(1);
  });
});
