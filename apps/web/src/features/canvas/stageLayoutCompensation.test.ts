import { describe, expect, it } from "vitest";
import { compensateViewportForStageRect } from "./stageLayoutCompensation";

describe("compensateViewportForStageRect", () => {
  it("keeps the canvas content aligned to the resized stage center during sidebar changes", () => {
    expect(
      compensateViewportForStageRect({
        previousStage: { left: 54, top: 0, width: 1102, height: 900 },
        stage: { left: 336, top: 0, width: 820, height: 900 },
        viewport: { x: 120, y: -40, zoom: 1 }
      })
    ).toEqual({ x: -21, y: -40, zoom: 1 });
  });

  it("keeps the canvas content aligned when the stage center changes during window resize", () => {
    expect(
      compensateViewportForStageRect({
        previousStage: { left: 54, top: 0, width: 1102, height: 900 },
        stage: { left: 54, top: 0, width: 1262, height: 900 },
        viewport: { x: 120, y: -40, zoom: 1 }
      })
    ).toEqual({ x: 200, y: -40, zoom: 1 });
  });

  it("keeps the canvas content aligned when the stage vertical center changes", () => {
    expect(
      compensateViewportForStageRect({
        previousStage: { left: 54, top: 0, width: 1102, height: 900 },
        stage: { left: 54, top: 0, width: 1102, height: 760 },
        viewport: { x: 120, y: -40, zoom: 1 }
      })
    ).toEqual({ x: 120, y: -110, zoom: 1 });
  });
});
