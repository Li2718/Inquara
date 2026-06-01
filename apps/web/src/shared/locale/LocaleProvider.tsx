"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMessages, type AppMessages } from "../messages";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_STORAGE_KEY,
  LOCALE_STORAGE_KEY,
  MANUAL_LOCALE_SOURCE,
  parseManualLocale,
  resolvePreferredLocale,
  type AppLocale
} from "./index";

type LocaleContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  resetLocale(): void;
  setLocale(locale: AppLocale): void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function resolveBrowserLocale() {
  return resolvePreferredLocale([
    ...(Array.isArray(window.navigator.languages) ? window.navigator.languages : []),
    window.navigator.language
  ]);
}

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    try {
      const manualLocale = parseManualLocale(
        window.localStorage.getItem(LOCALE_STORAGE_KEY),
        window.localStorage.getItem(LOCALE_SOURCE_STORAGE_KEY)
      );
      const preferredLocale = manualLocale ?? resolveBrowserLocale();
      if (preferredLocale !== locale) setLocaleState(preferredLocale);
    } catch {
      // Locale persistence is a convenience; rendering should still work without localStorage.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages: getMessages(locale),
      resetLocale() {
        let nextLocale = DEFAULT_LOCALE;
        try {
          window.localStorage.removeItem(LOCALE_STORAGE_KEY);
          window.localStorage.removeItem(LOCALE_SOURCE_STORAGE_KEY);
          nextLocale = resolveBrowserLocale();
        } catch {
          // Locale persistence is a convenience; rendering should still work without localStorage.
        }
        setLocaleState(nextLocale);
        document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.cookie = `${LOCALE_SOURCE_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
        router.refresh();
      },
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
        try {
          window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
          window.localStorage.setItem(LOCALE_SOURCE_STORAGE_KEY, MANUAL_LOCALE_SOURCE);
        } catch {
          // Locale persistence is a convenience; rendering should still work without localStorage.
        }
        document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.cookie = `${LOCALE_SOURCE_COOKIE_NAME}=${MANUAL_LOCALE_SOURCE}; Path=/; Max-Age=31536000; SameSite=Lax`;
        router.refresh();
      }
    }),
    [locale, router]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return value;
}
