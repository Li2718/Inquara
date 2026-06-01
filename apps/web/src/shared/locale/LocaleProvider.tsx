"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMessages, type AppMessages } from "../messages";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  parseLocale,
  type AppLocale
} from "./index";

type LocaleContextValue = {
  locale: AppLocale;
  messages: AppMessages;
  setLocale(locale: AppLocale): void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

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
      const storedLocale = parseLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
      if (storedLocale !== locale) {
        setLocaleState(storedLocale);
      }
    } catch {
      // Locale persistence is a convenience; rendering should still work without localStorage.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Locale persistence is a convenience; rendering should still work without localStorage.
    }
    document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      messages: getMessages(locale),
      setLocale(nextLocale) {
        setLocaleState(nextLocale);
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
