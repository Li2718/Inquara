import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

describe("appearance styles", () => {
  it("lets system preference resolve dark colors before client scripts run", () => {
    expect(styles).toContain('html[data-appearance="system"]');
    expect(styles).toContain("@media (prefers-color-scheme: dark)");
    expect(styles).toContain('html[data-appearance="system"] {\n    color-scheme: dark;');
    expect(styles).toContain("--app-background:");
    expect(styles).toContain("linear-gradient(135deg, #080c11 0%, #11151d 48%, #0a1117 100%)");
  });

  it("keeps dark message list backgrounds visually continuous", () => {
    expect(styles).toContain("--message-list-background: rgb(13 18 25 / 42%);");
    expect(styles).not.toContain("--message-list-background: linear-gradient(180deg, rgb(9 13 19 / 34%), rgb(17 23 31 / 24%));");
  });
});
