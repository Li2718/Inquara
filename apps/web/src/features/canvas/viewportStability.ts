export type CanvasViewportMeasurement = {
  viewportHeight: number;
  viewportWidth: number;
};

export type CanvasViewportStabilityState = {
  consecutiveMatches: number;
  lastMeasurement: CanvasViewportMeasurement | null;
};

export const initialCanvasViewportStabilityState: CanvasViewportStabilityState = {
  consecutiveMatches: 0,
  lastMeasurement: null
};

export function advanceCanvasViewportStability(
  state: CanvasViewportStabilityState,
  measurement: CanvasViewportMeasurement
): { isStable: boolean; state: CanvasViewportStabilityState } {
  const consecutiveMatches =
    state.lastMeasurement && canvasViewportMeasurementsEqual(state.lastMeasurement, measurement)
      ? state.consecutiveMatches + 1
      : 1;

  const nextState: CanvasViewportStabilityState = {
    consecutiveMatches,
    lastMeasurement: measurement
  };

  return {
    isStable: consecutiveMatches >= 2,
    state: nextState
  };
}

function canvasViewportMeasurementsEqual(left: CanvasViewportMeasurement, right: CanvasViewportMeasurement): boolean {
  return left.viewportWidth === right.viewportWidth && left.viewportHeight === right.viewportHeight;
}
