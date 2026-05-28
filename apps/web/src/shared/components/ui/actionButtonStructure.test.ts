import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared Button component", () => {
  it("exports a small action button primitive", () => {
    expect(existsSync("apps/web/src/shared/components/ui/Button.tsx")).toBe(true);

    const barrel = readFileSync("apps/web/src/shared/components/ui/index.ts", "utf8");

    expect(barrel).toContain("Button");
  });

  it("owns primary, secondary, and danger variants without changing the current CSS contract", () => {
    const button = readFileSync("apps/web/src/shared/components/ui/Button.tsx", "utf8");
    const styles = readFileSync("apps/web/src/shared/styles.css", "utf8");

    expect(button).toContain('type ButtonVariant = "primary" | "secondary" | "danger"');
    expect(button).toContain("variant?: ButtonVariant");
    expect(button).toContain("secondary-button");
    expect(button).toContain("danger-button");
    expect(styles).toContain(".secondary-button");
    expect(styles).toContain(".danger-button");
  });

  it("is used by ConfirmDialog action buttons", () => {
    const confirmDialog = readFileSync("apps/web/src/shared/components/ui/ConfirmDialog.tsx", "utf8");

    expect(confirmDialog).toContain("Button");
    expect(confirmDialog).not.toContain('className="secondary-button"');
    expect(confirmDialog).not.toContain('className={confirmClassName}');
  });
});
