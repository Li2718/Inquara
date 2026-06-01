import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, parseLocale } from "./index";

export async function getRequestLocale() {
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  return rawLocale ? parseLocale(rawLocale) : DEFAULT_LOCALE;
}
