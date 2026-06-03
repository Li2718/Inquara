import { describe, expect, it } from "vitest";
import { compensateViewportForStageRect } from "./stageLayoutCompensation";

describe("compensateViewportForStageRect", () => {
  it("keeps the canvas content aligned to the pushed stage center", () => {
    expect(
      compensateViewportForStageRect({
        previousStage: { left: 54, width: 1102 },
        stage: { left: 336, width: 820 },
        viewport: { x: 120, y: -40, zoom: 1 }
      })
    ).toEqual({ x: -21, y: -40, zoom: 1 });
  });
});
