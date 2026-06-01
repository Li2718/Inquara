import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_OPTIONS,
  LOCALE_STORAGE_KEY,
  isLocale,
  parseLocale
} from "./index";

describe("shared locale", () => {
  it("uses English as the default source locale", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LOCALE_OPTIONS.map(option => option.id)).toEqual(["en", "zh-CN"]);
  });

  it("parses only supported locales and falls back to English", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(parseLocale("zh-CN")).toBe("zh-CN");
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale(null)).toBe("en");
  });

  it("uses Inquara-scoped persistence keys", () => {
    expect(LOCALE_STORAGE_KEY).toBe("inquara.locale");
    expect(LOCALE_COOKIE_NAME).toBe("inquara_locale");
  });
});
