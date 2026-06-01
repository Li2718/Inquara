import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_OPTIONS,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  MANUAL_LOCALE_SOURCE,
  isLocale,
  matchSupportedLocale,
  parseAcceptLanguageHeader,
  parseLocale,
  parseManualLocale,
  resolvePreferredLocale
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

  it("matches browser language tags to supported locales", () => {
    expect(matchSupportedLocale("zh")).toBe("zh-CN");
    expect(matchSupportedLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(matchSupportedLocale("en-US")).toBe("en");
    expect(matchSupportedLocale("fr-FR")).toBeNull();
  });

  it("resolves the first supported browser-preferred locale", () => {
    expect(resolvePreferredLocale(["fr-FR", "zh-HK", "en-US"])).toBe("zh-CN");
    expect(resolvePreferredLocale(["fr-FR", "de-DE"])).toBe(DEFAULT_LOCALE);
  });

  it("parses Accept-Language header values by quality", () => {
    expect(parseAcceptLanguageHeader("en-US,en;q=0.8,zh-CN;q=0.9")).toEqual(["en-US", "zh-CN", "en"]);
    expect(resolvePreferredLocale(parseAcceptLanguageHeader("fr-FR,zh-CN;q=0.9,en;q=0.8"))).toBe("zh-CN");
  });

  it("uses persisted locales only when they were manually selected", () => {
    expect(parseManualLocale("zh-CN", MANUAL_LOCALE_SOURCE)).toBe("zh-CN");
    expect(parseManualLocale("zh-CN", null)).toBeNull();
    expect(parseManualLocale("fr", MANUAL_LOCALE_SOURCE)).toBeNull();
  });

  it("uses Inquara-scoped persistence keys", () => {
    expect(LOCALE_STORAGE_KEY).toBe("inquara.locale");
    expect(LOCALE_SOURCE_STORAGE_KEY).toBe("inquara.locale.source");
    expect(LOCALE_COOKIE_NAME).toBe("inquara_locale");
    expect(LOCALE_SOURCE_COOKIE_NAME).toBe("inquara_locale_source");
  });
});
