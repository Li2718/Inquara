import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canvas resize handle style", () => {
  it("keeps the resize affordance inside the node corner as a thin SVG grip", () => {
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(styles).toMatch(/\.canvas-node-resize-handle\s*{[^}]*right:\s*0;[^}]*bottom:\s*0;/);
    expect(styles).toMatch(/\.canvas-node-resize-handle\s*{[^}]*width:\s*16px;[^}]*height:\s*16px;/);
    expect(styles).toContain("viewBox='0 0 16 16'");
    expect(styles).toContain("M4 12L12 4");
    expect(styles).toContain("M4 9L9 4");
    expect(styles).toContain("stroke-width='1'");
    expect(styles).toContain("%235b7f8b");
    expect(styles).toContain("stroke-opacity='0.32'");
    expect(styles).toContain("stroke-opacity='0.22'");
    expect(styles).toContain("%23176b5c");
    expect(styles).toContain("stroke-opacity='0.52'");
    expect(styles).toContain("stroke-opacity='0.4'");
    expect(styles).not.toContain("%23ff00aa");
    expect(styles).not.toContain("%2300c8ff");
    expect(styles).toMatch(/\.canvas-node-resize-handle::before,\s*\.canvas-node-resize-handle::after\s*{[^}]*display:\s*none;/);
    expect(styles).not.toContain("transform: rotate(135deg)");
    expect(styles).not.toContain("transform: rotate(45deg)");
  });
});
