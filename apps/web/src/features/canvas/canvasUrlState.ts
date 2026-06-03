export type CanvasPathState =
  | {
      mode: "new";
    }
  | {
      mode: "workspace";
      workspaceId: string;
    };

export function parseCanvasPathState(pathname: string): CanvasPathState | null {
  if (pathname === "/workspaces/new") return { mode: "new" };

  const match = /^\/workspaces\/([^/?#]+)$/.exec(pathname);
  if (!match?.[1]) return null;
  return {
    mode: "workspace",
    workspaceId: decodeURIComponent(match[1])
  };
}

export function canvasPathForState(state: CanvasPathState): string {
  return state.mode === "new" ? "/workspaces/new" : `/workspaces/${encodeURIComponent(state.workspaceId)}`;
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
