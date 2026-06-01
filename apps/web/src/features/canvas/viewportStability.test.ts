import { describe, expect, it } from "vitest";
import {
  advanceCanvasViewportStability,
  initialCanvasViewportStabilityState,
  type CanvasViewportMeasurement
} from "./viewportStability";

function measurement(overrides: Partial<CanvasViewportMeasurement> = {}): CanvasViewportMeasurement {
  return {
    reservedLeft: 336,
    viewportHeight: 900,
    viewportWidth: 1440,
    ...overrides
  };
}

describe("advanceCanvasViewportStability", () => {
  it("waits for the same layout measurement twice before marking the viewport stable", () => {
    const first = advanceCanvasViewportStability(initialCanvasViewportStabilityState, measurement());
    const second = advanceCanvasViewportStability(first.state, measurement());

    expect(first.isStable).toBe(false);
    expect(second.isStable).toBe(true);
  });

  it("resets stability when the layout measurement changes", () => {
    const first = advanceCanvasViewportStability(initialCanvasViewportStabilityState, measurement());
    const changed = advanceCanvasViewportStability(first.state, measurement({ reservedLeft: 38 }));
    const stable = advanceCanvasViewportStability(changed.state, measurement({ reservedLeft: 38 }));

    expect(changed.isStable).toBe(false);
    expect(stable.isStable).toBe(true);
  });
});
