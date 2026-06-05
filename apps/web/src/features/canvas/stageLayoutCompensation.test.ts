import { describe, expect, it } from "vitest";
import { compensateViewportForStageRect, getVisibleStageRectForSidebar } from "./stageLayoutCompensation";

describe("compensateViewportForStageRect", () => {
  it("keeps the canvas content aligned to the visible stage center during sidebar changes", () => {
    expect(
      compensateViewportForStageRect({
        previousStage: { left: 0, top: 0, width: 1156, height: 900 },
        stage: { left: 336, top: 0, width: 820, height: 900 },
        viewport: { x: 120, y: -40, zoom: 1 }
      })
    ).toEqual({ x: 288, y: -40, zoom: 1 });
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

describe("getVisibleStageRectForSidebar", () => {
  it("uses the full stage when the sidebar is collapsed", () => {
    expect(
      getVisibleStageRectForSidebar(
        { left: 0, top: 0, width: 970, height: 900 },
        { left: 16, width: 38, collapsedWidth: 38, expandedWidth: 320 }
      )
    ).toEqual({ left: 0, top: 0, width: 970, height: 900 });
  });

  it("excludes the expanded sidebar from the visible stage", () => {
    expect(
      getVisibleStageRectForSidebar(
        { left: 0, top: 0, width: 970, height: 900 },
        { left: 16, width: 320, collapsedWidth: 38, expandedWidth: 320 }
      )
    ).toEqual({ left: 336, top: 0, width: 634, height: 900 });
  });

  it("interpolates the visible stage while the sidebar is collapsing", () => {
    expect(
      getVisibleStageRectForSidebar(
        { left: 0, top: 0, width: 970, height: 900 },
        { left: 16, width: 179, collapsedWidth: 38, expandedWidth: 320 }
      )
    ).toEqual({ left: 168, top: 0, width: 802, height: 900 });
  });
});
