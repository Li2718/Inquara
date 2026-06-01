export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "inquara.locale";
export const LOCALE_COOKIE_NAME = "inquara_locale";

export const LOCALE_OPTIONS: Array<{
  id: AppLocale;
  label: string;
  shortLabel: string;
}> = [
  {
    id: "en",
    label: "English",
    shortLabel: "EN"
  },
  {
    id: "zh-CN",
    label: "简体中文",
    shortLabel: "中"
  }
];

export function isLocale(value: unknown): value is AppLocale {
  return value === "en" || value === "zh-CN";
}

export function parseLocale(rawValue: string | null | undefined): AppLocale {
  return isLocale(rawValue) ? rawValue : DEFAULT_LOCALE;
}
