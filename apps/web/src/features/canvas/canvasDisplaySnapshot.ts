import type { CanvasSnapshot } from "@inquara/domain";

export function selectCanvasDisplaySnapshot({
  cachedSnapshot,
  currentDisplaySnapshot,
  targetCanvasId
}: {
  cachedSnapshot: CanvasSnapshot | null;
  currentDisplaySnapshot: CanvasSnapshot | null;
  targetCanvasId: string;
}): CanvasSnapshot | null {
  if (cachedSnapshot?.canvas.id === targetCanvasId) return cachedSnapshot;
  return currentDisplaySnapshot;
}
