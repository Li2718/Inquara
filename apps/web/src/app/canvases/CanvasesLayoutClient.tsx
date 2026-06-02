"use client";

import { useParams } from "next/navigation";
import { CanvasSurface } from "../../features/canvas/CanvasSurface";

export function CanvasesLayoutClient({ initialSidebarOpen }: { initialSidebarOpen: boolean }) {
  const params = useParams<{ canvasId?: string }>();
  const canvasId = params.canvasId;

  if (!canvasId) return null;

  return <CanvasSurface initialSidebarOpen={initialSidebarOpen} canvasId={canvasId} />;
}
