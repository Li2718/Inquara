export type DebugPosition = { x: number; y: number };
export type DebugViewport = { width: number; height: number };

export const DEBUG_POSITION_STORAGE_KEY = "inquara.debug_position";
export const BUBBLE_WIDTH = 44;
export const BUBBLE_HEIGHT = 44;
export const SCREEN_GAP = 8;

export function readStoredDebugPosition(storedPosition: string | null, viewport: DebugViewport): DebugPosition | null {
  if (!storedPosition) return null;
  try {
    const parsed = JSON.parse(storedPosition) as { x?: unknown; y?: unknown };
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      return clampDebugPosition(parsed.x, parsed.y, viewport);
    }
  } catch {
    return null;
  }
  return null;
}

export function defaultDebugPosition(viewport: DebugViewport): DebugPosition {
  return {
    x: viewport.width - BUBBLE_WIDTH - SCREEN_GAP,
    y: SCREEN_GAP
  };
}

export function clampDebugPosition(x: number, y: number, viewport: DebugViewport): DebugPosition {
  return {
    x: Math.min(Math.max(SCREEN_GAP, x), Math.max(SCREEN_GAP, viewport.width - BUBBLE_WIDTH - SCREEN_GAP)),
    y: Math.min(Math.max(SCREEN_GAP, y), Math.max(SCREEN_GAP, viewport.height - BUBBLE_HEIGHT - SCREEN_GAP))
  };
}

export function adaptDebugPositionToViewport(position: DebugPosition, previousViewport: DebugViewport, nextViewport: DebugViewport): DebugPosition {
  const previousRight = previousViewport.width - BUBBLE_WIDTH - SCREEN_GAP;
  const previousBottom = previousViewport.height - BUBBLE_HEIGHT - SCREEN_GAP;
  const nextX = position.x >= previousRight ? nextViewport.width - BUBBLE_WIDTH - SCREEN_GAP : position.x;
  const nextY = position.y >= previousBottom ? nextViewport.height - BUBBLE_HEIGHT - SCREEN_GAP : position.y;
  return clampDebugPosition(nextX, nextY, nextViewport);
}

export function shouldPersistDebugPosition(reason: "drag-end" | "restore" | "resize" | "render") {
  return reason === "drag-end";
}
