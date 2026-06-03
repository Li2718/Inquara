export type StageViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type StageRect = {
  left: number;
  width: number;
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
  const previousCenter = previousStage.left + previousStage.width / 2;
  const center = stage.left + stage.width / 2;
  return {
    ...viewport,
    x: viewport.x - (center - previousCenter)
  };
}
