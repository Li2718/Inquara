import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canvas edge style", () => {
  it("renders branch edges as dashed, non-animated lines", () => {
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(styles).toMatch(/\.canvas-edge\s+\.react-flow__edge-path[\s\S]*stroke-dasharray:/);
  });
});
