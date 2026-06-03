export type CanvasPathState =
  | {
      mode: "new";
    }
  | {
      canvasId: string;
      mode: "canvas";
    };

export function parseCanvasPathState(pathname: string): CanvasPathState | null {
  if (pathname === "/canvases/new") return { mode: "new" };

  const match = /^\/canvases\/([^/?#]+)$/.exec(pathname);
  if (!match?.[1]) return null;
  return {
    canvasId: decodeURIComponent(match[1]),
    mode: "canvas"
  };
}

export function canvasPathForState(state: CanvasPathState): string {
  return state.mode === "new" ? "/canvases/new" : `/canvases/${encodeURIComponent(state.canvasId)}`;
}

export function writeCanvasPathState(
  state: CanvasPathState,
  options: {
    replace?: boolean;
    windowRef?: Window;
  } = {}
): void {
  const windowRef = options.windowRef ?? (typeof window === "undefined" ? null : window);
  if (!windowRef) return;

  const nextPath = canvasPathForState(state);
  if (windowRef.location.pathname === nextPath) return;

  if (options.replace) {
    windowRef.history.replaceState(null, "", nextPath);
    return;
  }

  windowRef.history.pushState(null, "", nextPath);
}
