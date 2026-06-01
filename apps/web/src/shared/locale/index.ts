export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_STORAGE_KEY = "inquara.locale";
export const LOCALE_SOURCE_STORAGE_KEY = "inquara.locale.source";
export const LOCALE_COOKIE_NAME = "inquara_locale";
export const LOCALE_SOURCE_COOKIE_NAME = "inquara_locale_source";
export const MANUAL_LOCALE_SOURCE = "manual";

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

export function parseManualLocale(rawLocale: string | null | undefined, rawSource: string | null | undefined): AppLocale | null {
  if (rawSource !== MANUAL_LOCALE_SOURCE) return null;
  return isLocale(rawLocale) ? rawLocale : null;
}

export function matchSupportedLocale(rawValue: string | null | undefined): AppLocale | null {
  if (!rawValue) return null;
  const normalized = rawValue.trim().replace("_", "-");
  if (!normalized) return null;

  const exactLocale = SUPPORTED_LOCALES.find(locale => locale.toLowerCase() === normalized.toLowerCase());
  if (exactLocale) return exactLocale;

  const language = normalized.split("-")[0]?.toLowerCase();
  if (language === "en") return "en";
  if (language === "zh") return "zh-CN";

  return null;
}

export function parseAcceptLanguageHeader(rawHeader: string | null | undefined): string[] {
  if (!rawHeader) return [];

  return rawHeader
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const qualityParam = params.find(param => param.trim().toLowerCase().startsWith("q="));
      const quality = qualityParam ? Number.parseFloat(qualityParam.split("=")[1] ?? "") : 1;
      return {
        index,
        tag: tag.trim(),
        quality: Number.isFinite(quality) ? quality : 0
      };
    })
    .filter(item => item.tag && item.quality > 0)
    .sort((left, right) => right.quality - left.quality || left.index - right.index)
    .map(item => item.tag);
}

export function resolvePreferredLocale(rawLocales: ReadonlyArray<string | null | undefined>): AppLocale {
  for (const rawLocale of rawLocales) {
    const matchedLocale = matchSupportedLocale(rawLocale);
    if (matchedLocale) return matchedLocale;
  }

  return DEFAULT_LOCALE;
}
