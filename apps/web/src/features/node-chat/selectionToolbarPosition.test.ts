import { describe, expect, it } from "vitest";
import { getLastVisibleSelectionRect, toScrollableLocalPoint, toViewportToolbarPoint } from "./selectionToolbarPosition";

describe("selection toolbar positioning", () => {
  it("uses the last visible selection fragment", () => {
    expect(
      getLastVisibleSelectionRect([
        { left: 10, right: 20, top: 10, bottom: 20, width: 10, height: 10 },
        { left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 },
        { left: 30, right: 50, top: 30, bottom: 42, width: 20, height: 12 }
      ])
    ).toMatchObject({ left: 30, right: 50 });
  });

  it("converts viewport selection coordinates into unscaled scrollable local coordinates", () => {
    expect(
      toScrollableLocalPoint({
        containerClientHeight: 500,
        containerClientWidth: 400,
        containerRect: { left: 100, right: 300, top: 80, bottom: 330, width: 200, height: 250 },
        scrollLeft: 0,
        scrollTop: 120,
        selectionRect: { left: 160, right: 260, top: 180, bottom: 205, width: 100, height: 25 }
      })
    ).toEqual({ x: 320, y: 370 });
  });

  it("keeps the toolbar in the viewport without depending on scrollable content height", () => {
    expect(
      toViewportToolbarPoint({
        selectionRect: { left: 270, right: 380, top: 410, bottom: 435, width: 110, height: 25 },
        viewportHeight: 460,
        viewportWidth: 520
      })
    ).toEqual({ x: 328, y: 362 });
  });
});
