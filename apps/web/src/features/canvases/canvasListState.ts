import type { Canvas } from "@inquara/domain";

export type CanvasListPlacement = "preserve" | "top";

export function upsertCanvasList(
  canvases: Canvas[],
  canvas: Canvas,
  options: { placement?: CanvasListPlacement } = {}
): Canvas[] {
  const placement = options.placement ?? "top";
  if (placement === "preserve" && canvases.some(item => item.id === canvas.id)) {
    return canvases.map(item => (item.id === canvas.id ? canvas : item));
  }
  return [canvas, ...canvases.filter(item => item.id !== canvas.id)];
}
