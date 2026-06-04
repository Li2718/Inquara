import { APPEARANCE_COOKIE_NAME, DEFAULT_APPEARANCE_MODE, type AppearanceMode, type AppearancePreference } from "./index";

type AppearanceRoot = {
  dataset: {
    appearance?: string | undefined;
  };
  style: {
    colorScheme?: string;
  };
};

type MatchMedia = (query: string) => Pick<MediaQueryList, "matches">;

export function applyAppearanceMode(root: AppearanceRoot, mode: AppearanceMode): void {
  root.dataset.appearance = mode;
  root.style.colorScheme = mode;
}

export function createAppearanceCookieValue(preference: AppearancePreference): string {
  return `${APPEARANCE_COOKIE_NAME}=${preference}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function readSystemAppearanceMode(matchMedia: MatchMedia | undefined): AppearanceMode {
  if (!matchMedia) return DEFAULT_APPEARANCE_MODE;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
