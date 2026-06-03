const newCanvasDraftStorageKey = "inquara.new-canvas.draft";
const pendingStarterMessagePrefix = "inquara.new-canvas.pending-starter";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getNewCanvasDraft(): string {
  if (!canUseStorage()) return "";
  return window.localStorage.getItem(newCanvasDraftStorageKey) ?? "";
}

export function saveNewCanvasDraft(value: string): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(newCanvasDraftStorageKey, value);
}

export function clearNewCanvasDraft(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(newCanvasDraftStorageKey);
}

export function savePendingStarterMessage(workspaceId: string, value: string): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(pendingStarterMessageKey(workspaceId), value);
}

export function getPendingStarterMessage(workspaceId: string): string | null {
  if (!canUseStorage()) return null;
  return window.sessionStorage.getItem(pendingStarterMessageKey(workspaceId));
}

export function clearPendingStarterMessage(workspaceId: string): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(pendingStarterMessageKey(workspaceId));
}

function pendingStarterMessageKey(workspaceId: string): string {
  return `${pendingStarterMessagePrefix}:${workspaceId}`;
}
