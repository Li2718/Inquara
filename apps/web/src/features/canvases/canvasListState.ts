import type { Canvas } from "@inquara/domain";

export function upsertCanvasList(canvases: Canvas[], canvas: Canvas): Canvas[] {
  return [canvas, ...canvases.filter(item => item.id !== canvas.id)];
}
