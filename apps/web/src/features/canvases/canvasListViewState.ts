export type CanvasListViewState = "loading" | "login" | "canvas-loading";

export function getCanvasListViewState({
  isLoading,
  needsLogin
}: {
  isLoading: boolean;
  needsLogin: boolean;
}): CanvasListViewState {
  if (needsLogin) return "login";
  return isLoading ? "loading" : "canvas-loading";
}
