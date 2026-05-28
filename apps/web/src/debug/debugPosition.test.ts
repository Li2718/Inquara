import { describe, expect, it } from "vitest";
import {
  adaptDebugPositionToViewport,
  clampDebugPosition,
  defaultDebugPosition,
  readStoredDebugPosition,
  shouldPersistDebugPosition
} from "./debugPosition";

const viewport = { width: 1000, height: 700 };

describe("debug floating position", () => {
  it("restores a valid stored position within the current viewport", () => {
    expect(readStoredDebugPosition(JSON.stringify({ x: 320, y: 240 }), viewport)).toEqual({ x: 320, y: 240 });
  });

  it("clamps stored positions that are outside the current viewport", () => {
    expect(readStoredDebugPosition(JSON.stringify({ x: 2000, y: -50 }), viewport)).toEqual({ x: 948, y: 8 });
  });

  it("uses the top right default only when there is no stored position", () => {
    expect(defaultDebugPosition(viewport)).toEqual({ x: 948, y: 8 });
  });

  it("does not treat resize or restore clamping as a persistent user move", () => {
    expect(shouldPersistDebugPosition("drag-end")).toBe(true);
    expect(shouldPersistDebugPosition("restore")).toBe(false);
    expect(shouldPersistDebugPosition("resize")).toBe(false);
    expect(shouldPersistDebugPosition("render")).toBe(false);
  });

  it("keeps the bubble inside the screen gap", () => {
    expect(clampDebugPosition(-100, 900, viewport)).toEqual({ x: 8, y: 648 });
  });

  it("keeps the bubble attached to the right or bottom edge when the viewport grows", () => {
    expect(
      adaptDebugPositionToViewport(
        { x: 648, y: 548 },
        { width: 700, height: 600 },
        { width: 1000, height: 800 }
      )
    ).toEqual({ x: 948, y: 748 });
  });

  it("does not move a free-floating bubble when the viewport grows", () => {
    expect(
      adaptDebugPositionToViewport(
        { x: 320, y: 240 },
        { width: 700, height: 600 },
        { width: 1000, height: 800 }
      )
    ).toEqual({ x: 320, y: 240 });
  });
});
