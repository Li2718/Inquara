const pendingCanvasLeaseReleases = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

export function scheduleCanvasLeaseRelease(
  canvasId: string,
  release: () => void | Promise<void>,
  delayMs: number
): void {
  cancelPendingCanvasLeaseRelease(canvasId);
  const timer = globalThis.setTimeout(() => {
    pendingCanvasLeaseReleases.delete(canvasId);
    void release();
  }, delayMs);
  pendingCanvasLeaseReleases.set(canvasId, timer);
}

export function cancelPendingCanvasLeaseRelease(canvasId: string): void {
  const timer = pendingCanvasLeaseReleases.get(canvasId);
  if (timer === undefined) return;
  globalThis.clearTimeout(timer);
  pendingCanvasLeaseReleases.delete(canvasId);
}
