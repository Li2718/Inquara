import { describe, expect, it } from "vitest";
import { clampDebugPosition, defaultDebugPosition, readStoredDebugPosition, shouldPersistDebugPosition } from "./debugPosition";

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
});
