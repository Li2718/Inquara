import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelPendingCanvasLeaseRelease, scheduleCanvasLeaseRelease } from "./leaseReleaseScheduler";

describe("lease release scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("cancels a pending release when the same canvas remounts immediately", async () => {
    const release = vi.fn();

    scheduleCanvasLeaseRelease("canvas-1", release, 250);
    cancelPendingCanvasLeaseRelease("canvas-1");
    await vi.advanceTimersByTimeAsync(250);

    expect(release).not.toHaveBeenCalled();
  });

  it("releases the canvas when the unmount is final", async () => {
    const release = vi.fn();

    scheduleCanvasLeaseRelease("canvas-1", release, 250);
    await vi.advanceTimersByTimeAsync(250);

    expect(release).toHaveBeenCalledTimes(1);
  });
});
