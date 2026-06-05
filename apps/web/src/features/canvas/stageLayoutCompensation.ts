export type StageViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type StageRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SidebarRect = {
  left: number;
  width: number;
  collapsedWidth: number;
  expandedWidth: number;
};

export function getVisibleStageRectForSidebar(stage: StageRect, sidebar: SidebarRect): StageRect {
  const animatedRange = sidebar.expandedWidth - sidebar.collapsedWidth;
  const openProgress = animatedRange > 0 ? (sidebar.width - sidebar.collapsedWidth) / animatedRange : 0;
  const clampedProgress = Math.min(1, Math.max(0, openProgress));
  const sidebarInset = Math.round((sidebar.left + sidebar.expandedWidth) * clampedProgress);

  return {
    height: stage.height,
    left: stage.left + sidebarInset,
    top: stage.top,
    width: Math.max(0, stage.width - sidebarInset)
  };
}

export function compensateViewportForStageRect({
  previousStage,
  stage,
  viewport
}: {
  previousStage: StageRect;
  stage: StageRect;
  viewport: StageViewport;
}): StageViewport {
  const previousCenterX = previousStage.left + previousStage.width / 2;
  const previousCenterY = previousStage.height / 2;
  const centerX = stage.left + stage.width / 2;
  const centerY = stage.height / 2;
  return {
    ...viewport,
    x: viewport.x + (centerX - previousCenterX),
    y: viewport.y + (centerY - previousCenterY)
  };
}
