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

export function compensateViewportForStageRect({
  previousStage,
  stage,
  viewport
}: {
  previousStage: StageRect;
  stage: StageRect;
  viewport: StageViewport;
}): StageViewport {
  const previousCenterX = previousStage.width / 2;
  const previousCenterY = previousStage.height / 2;
  const centerX = stage.width / 2;
  const centerY = stage.height / 2;
  return {
    ...viewport,
    x: viewport.x + (centerX - previousCenterX),
    y: viewport.y + (centerY - previousCenterY)
  };
}
