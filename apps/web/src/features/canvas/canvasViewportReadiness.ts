export function shouldHideCanvasUntilViewportReady({
  canvasId,
  hasCachedSnapshot,
  isViewportReady
}: {
  canvasId: string | null;
  hasCachedSnapshot: boolean;
  isViewportReady: boolean;
}): boolean {
  if (!canvasId) return true;
  return !isViewportReady && !hasCachedSnapshot;
}
