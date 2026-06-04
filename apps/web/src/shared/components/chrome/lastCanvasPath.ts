const LAST_CANVAS_PATH_STORAGE_KEY = "inquara:last-canvas-path";

export function rememberLastCanvasPath(windowRef: Window | null | undefined = getWindowRef()): void {
  if (!windowRef) return;
  const pathname = windowRef.location.pathname;
  if (!isRememberableCanvasPath(pathname)) return;

  try {
    windowRef.sessionStorage.setItem(LAST_CANVAS_PATH_STORAGE_KEY, pathname);
  } catch {
    // Remembering the last canvas is a navigation convenience; normal routing still works without storage.
  }
}

export function getLastCanvasPath(windowRef: Window | null | undefined = getWindowRef()): string {
  if (!windowRef) return "/";

  try {
    const storedPath = windowRef.sessionStorage.getItem(LAST_CANVAS_PATH_STORAGE_KEY);
    return storedPath && isRememberableCanvasPath(storedPath) ? storedPath : "/";
  } catch {
    return "/";
  }
}

function isRememberableCanvasPath(pathname: string): boolean {
  return pathname.startsWith("/canvases/") && pathname !== "/canvases/new";
}

function getWindowRef(): Window | null {
  return typeof window === "undefined" ? null : window;
}
