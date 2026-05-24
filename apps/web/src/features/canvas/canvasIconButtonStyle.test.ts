import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("canvas icon button style", () => {
  it("keeps node header icon buttons visually quiet on hover", () => {
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(styles).toMatch(/\.icon-button\s*{[^}]*background:\s*transparent;/);
    expect(styles).toMatch(/\.icon-button:hover\s*{[^}]*background:\s*transparent;[^}]*box-shadow:\s*none;[^}]*transform:\s*none;/);
    expect(styles).toMatch(/\.hide-branch-button\s*{[^}]*color:\s*var\(--accent-dark\);/);
    expect(styles).toMatch(/\.hide-branch-button:hover\s*{[^}]*color:\s*var\(--accent\);/);
  });
});
