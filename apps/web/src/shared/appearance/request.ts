import { cookies } from "next/headers";
import { APPEARANCE_COOKIE_NAME, DEFAULT_APPEARANCE_MODE, parseAppearancePreference, resolveAppearanceMode } from "./index";

export async function getRequestAppearancePreference() {
  const cookieStore = await cookies();
  return parseAppearancePreference(cookieStore.get(APPEARANCE_COOKIE_NAME)?.value);
}

export async function getRequestAppearanceMode() {
  return resolveAppearanceMode(await getRequestAppearancePreference(), DEFAULT_APPEARANCE_MODE);
}
