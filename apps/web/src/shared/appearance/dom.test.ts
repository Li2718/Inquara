import { describe, expect, it, vi } from "vitest";
import { applyAppearanceMode, createAppearanceCookieValue, readSystemAppearanceMode } from "./dom";

describe("appearance DOM helpers", () => {
  it("applies appearance mode to the root document element", () => {
    const root = {
      dataset: {} as Record<string, string>,
      style: {} as { colorScheme?: string }
    };

    applyAppearanceMode(root, "dark");

    expect(root.dataset.appearance).toBe("dark");
    expect(root.style.colorScheme).toBe("dark");
  });

  it("creates a stable cookie value for the selected preference", () => {
    expect(createAppearanceCookieValue("system")).toBe("inquara_appearance=system; Path=/; Max-Age=31536000; SameSite=Lax");
    expect(createAppearanceCookieValue("dark")).toBe("inquara_appearance=dark; Path=/; Max-Age=31536000; SameSite=Lax");
  });

  it("reads dark system mode from matchMedia", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });

    expect(readSystemAppearanceMode(matchMedia)).toBe("dark");
    expect(matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
  });

  it("falls back to light when matchMedia is unavailable", () => {
    expect(readSystemAppearanceMode(undefined)).toBe("light");
  });
});
