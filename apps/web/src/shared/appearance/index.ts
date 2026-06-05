export type AppearanceMode = "light" | "dark";

export type AppearancePreference = "system" | AppearanceMode;

export const DEFAULT_APPEARANCE_PREFERENCE: AppearancePreference = "system";
export const DEFAULT_APPEARANCE_MODE: AppearanceMode = "light";
export const APPEARANCE_STORAGE_KEY = "inquara.appearance";
export const APPEARANCE_COOKIE_NAME = "inquara_appearance";

export function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === "light" || value === "dark";
}

export function isAppearancePreference(value: unknown): value is AppearancePreference {
  return value === "system" || isAppearanceMode(value);
}

export function parseAppearancePreference(rawValue: string | null | undefined): AppearancePreference {
  return isAppearancePreference(rawValue) ? rawValue : DEFAULT_APPEARANCE_PREFERENCE;
}

export function resolveAppearanceMode(preference: AppearancePreference, systemMode: AppearanceMode): AppearanceMode {
  return preference === "system" ? systemMode : preference;
}

export function resolveInitialDocumentAppearance(preference: AppearancePreference): AppearancePreference {
  return preference;
}
