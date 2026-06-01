import { cookies } from "next/headers";
import { headers } from "next/headers";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  parseAcceptLanguageHeader,
  parseManualLocale,
  resolvePreferredLocale
} from "./index";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  const rawLocaleSource = cookieStore.get(LOCALE_SOURCE_COOKIE_NAME)?.value;
  const manualLocale = parseManualLocale(rawLocale, rawLocaleSource);

  if (manualLocale) return manualLocale;

  return resolvePreferredLocale(parseAcceptLanguageHeader(headerStore.get("accept-language")));
}
