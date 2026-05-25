import { describe, expect, it } from "vitest";
import { clampNodeSize } from "./nodeResize";

describe("clampNodeSize", () => {
  it("keeps resized chat nodes above the usable minimum size", () => {
    expect(clampNodeSize({ width: 260, height: 250 })).toEqual({ width: 320, height: 360 });
  });

  it("rounds usable node sizes for stable persistence", () => {
    expect(clampNodeSize({ width: 540.4, height: 680.6 })).toEqual({ width: 540, height: 681 });
  });
});
