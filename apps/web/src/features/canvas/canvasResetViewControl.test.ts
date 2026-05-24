import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canvas reset view control", () => {
  it("uses one custom reset-view button instead of React Flow controls", () => {
    const source = readFileSync("apps/web/src/features/canvas/CanvasView.tsx", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(source).not.toContain("Controls");
    expect(source).toContain("setCenter");
    expect(source).toContain("findFirstVisibleRootNode");
    expect(source).toContain("hideAttribution: true");
    expect(source).toContain("canvas-reset-view-button");
    expect(styles).toMatch(/\.canvas-reset-view-button\s*{/);
  });
});
