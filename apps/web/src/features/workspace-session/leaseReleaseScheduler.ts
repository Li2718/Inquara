const pendingWorkspaceLeaseReleases = new Map<string, ReturnType<typeof globalThis.setTimeout>>();

export function scheduleWorkspaceLeaseRelease(
  workspaceId: string,
  release: () => void | Promise<void>,
  delayMs: number
): void {
  cancelPendingWorkspaceLeaseRelease(workspaceId);
  const timer = globalThis.setTimeout(() => {
    pendingWorkspaceLeaseReleases.delete(workspaceId);
    void release();
  }, delayMs);
  pendingWorkspaceLeaseReleases.set(workspaceId, timer);
}

export function cancelPendingWorkspaceLeaseRelease(workspaceId: string): void {
  const timer = pendingWorkspaceLeaseReleases.get(workspaceId);
  if (timer === undefined) return;
  globalThis.clearTimeout(timer);
  pendingWorkspaceLeaseReleases.delete(workspaceId);
}
