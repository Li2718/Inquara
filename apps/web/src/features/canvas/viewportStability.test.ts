import { describe, expect, it } from "vitest";
import {
  advanceCanvasViewportStability,
  initialCanvasViewportStabilityState,
  type CanvasViewportMeasurement
} from "./viewportStability";

function measurement(overrides: Partial<CanvasViewportMeasurement> = {}): CanvasViewportMeasurement {
  return {
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
    const changed = advanceCanvasViewportStability(first.state, measurement({ viewportWidth: 1120 }));
    const stable = advanceCanvasViewportStability(changed.state, measurement({ viewportWidth: 1120 }));

    expect(changed.isStable).toBe(false);
    expect(stable.isStable).toBe(true);
  });

  it("tracks only the pushed canvas stage size", () => {
    const current = measurement();

    expect(Object.keys(current).sort()).toEqual(["viewportHeight", "viewportWidth"]);
  });
});
