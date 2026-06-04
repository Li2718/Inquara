export function shouldHideCanvasUntilViewportReady({
  canvasId,
  hasCachedSnapshot,
  isViewportReady,
  routeCanvasId
}: {
  canvasId: string | null;
  hasCachedSnapshot: boolean;
  isViewportReady: boolean;
  routeCanvasId: string;
}): boolean {
  if (!canvasId) return true;
  if (canvasId !== routeCanvasId) return true;
  return !isViewportReady && !hasCachedSnapshot;
}
