import { describe, expect, it } from "vitest";
import { advanceSessionGeneration, createSessionGeneration, isCurrentSessionGeneration } from "./sessionGeneration";

describe("canvas session generation", () => {
  it("invalidates earlier async work after a later session starts", () => {
    const generation = createSessionGeneration();
    const first = advanceSessionGeneration(generation);
    const second = advanceSessionGeneration(generation);

    expect(isCurrentSessionGeneration(generation, first)).toBe(false);
    expect(isCurrentSessionGeneration(generation, second)).toBe(true);
  });
});
