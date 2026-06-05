import { describe, expect, it } from "vitest";
import {
  APPEARANCE_COOKIE_NAME,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_MODE,
  DEFAULT_APPEARANCE_PREFERENCE,
  isAppearanceMode,
  isAppearancePreference,
  parseAppearancePreference,
  resolveAppearanceMode
} from "./index";

describe("shared appearance", () => {
  it("uses system preference by default while keeping light as the server fallback mode", () => {
    expect(DEFAULT_APPEARANCE_PREFERENCE).toBe("system");
    expect(DEFAULT_APPEARANCE_MODE).toBe("light");
  });

  it("parses only supported appearance preferences", () => {
    expect(isAppearanceMode("light")).toBe(true);
    expect(isAppearanceMode("dark")).toBe(true);
    expect(isAppearanceMode("system")).toBe(false);
    expect(isAppearancePreference("system")).toBe(true);
    expect(isAppearancePreference("light")).toBe(true);
    expect(isAppearancePreference("dark")).toBe(true);
    expect(isAppearancePreference("blue")).toBe(false);

    expect(parseAppearancePreference("dark")).toBe("dark");
    expect(parseAppearancePreference("light")).toBe("light");
    expect(parseAppearancePreference("system")).toBe("system");
    expect(parseAppearancePreference("blue")).toBe(DEFAULT_APPEARANCE_PREFERENCE);
    expect(parseAppearancePreference(null)).toBe(DEFAULT_APPEARANCE_PREFERENCE);
  });

  it("resolves system preference from the current system mode", () => {
    expect(resolveAppearanceMode("system", "dark")).toBe("dark");
    expect(resolveAppearanceMode("system", "light")).toBe("light");
    expect(resolveAppearanceMode("dark", "light")).toBe("dark");
    expect(resolveAppearanceMode("light", "dark")).toBe("light");
  });

  it("keeps system as the initial document appearance so CSS can resolve it before scripts run", async () => {
    const { resolveInitialDocumentAppearance } = await import("./index");

    expect(resolveInitialDocumentAppearance("system")).toBe("system");
    expect(resolveInitialDocumentAppearance("dark")).toBe("dark");
    expect(resolveInitialDocumentAppearance("light")).toBe("light");
  });

  it("uses Inquara-scoped persistence keys", () => {
    expect(APPEARANCE_STORAGE_KEY).toBe("inquara.appearance");
    expect(APPEARANCE_COOKIE_NAME).toBe("inquara_appearance");
  });
});
