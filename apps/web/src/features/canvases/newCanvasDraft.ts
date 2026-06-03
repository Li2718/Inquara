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

export function savePendingStarterMessage(canvasId: string, value: string): void {
  if (!canUseStorage()) return;
  window.sessionStorage.setItem(pendingStarterMessageKey(canvasId), value);
}

export function getPendingStarterMessage(canvasId: string): string | null {
  if (!canUseStorage()) return null;
  return window.sessionStorage.getItem(pendingStarterMessageKey(canvasId));
}

export function clearPendingStarterMessage(canvasId: string): void {
  if (!canUseStorage()) return;
  window.sessionStorage.removeItem(pendingStarterMessageKey(canvasId));
}

function pendingStarterMessageKey(canvasId: string): string {
  return `${pendingStarterMessagePrefix}:${canvasId}`;
}
