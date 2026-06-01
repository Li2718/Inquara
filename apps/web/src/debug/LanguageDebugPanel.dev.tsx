"use client";

import { useEffect, useState } from "react";
import {
  LOCALE_COOKIE_NAME,
  LOCALE_SOURCE_COOKIE_NAME,
  LOCALE_SOURCE_STORAGE_KEY,
  LOCALE_STORAGE_KEY
} from "../shared/locale";
import { useLocale } from "../shared/locale/LocaleProvider";

const LANGUAGE_DEBUG_REFRESH_MS = 500;

type LanguageDebugState = {
  htmlLang: string;
  navigatorLanguage: string;
  navigatorLanguages: string;
  storedLocale: string;
  storedSource: string;
  cookieLocale: string;
  cookieSource: string;
};

export function LanguageDebugPanel() {
  const { locale, resetLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<LanguageDebugState>(() => readLanguageDebugState());

  useEffect(() => {
    setState(readLanguageDebugState());
  }, [isOpen, locale]);

  useEffect(() => {
    if (!isOpen) return;

    const refreshState = () => setState(readLanguageDebugState());
    const intervalId = window.setInterval(refreshState, LANGUAGE_DEBUG_REFRESH_MS);
    const observer = new MutationObserver(refreshState);

    observer.observe(document.documentElement, { attributeFilter: ["lang"], attributes: true });
    window.addEventListener("storage", refreshState);
    refreshState();

    return () => {
      window.clearInterval(intervalId);
      observer.disconnect();
      window.removeEventListener("storage", refreshState);
    };
  }, [isOpen]);

  function resetLanguage() {
    resetLocale();
  }

  return (
    <section className="debug-panel-section" aria-label="Language debug">
      <button
        type="button"
        className="debug-panel-toggle"
        aria-expanded={isOpen}
        aria-controls="debug-language-details"
        onClick={() => setIsOpen(value => !value)}
      >
        Language debug
      </button>
      {isOpen ? (
        <div id="debug-language-details" className="debug-panel-details">
          <dl className="debug-panel-list" aria-label="Language debug details">
            <DebugRow label="Active locale" value={locale} />
            <DebugRow label="HTML lang" value={state.htmlLang} />
            <DebugRow label="navigator.language" value={state.navigatorLanguage} />
            <DebugRow label="navigator.languages" value={state.navigatorLanguages} />
            <DebugRow label="Storage locale" value={state.storedLocale} />
            <DebugRow label="Storage source" value={state.storedSource} />
            <DebugRow label="Cookie locale" value={state.cookieLocale} />
            <DebugRow label="Cookie source" value={state.cookieSource} />
          </dl>
          <div className="debug-panel-actions">
            <button type="button" onClick={resetLanguage}>
              Reset language
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-panel-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function readLanguageDebugState(): LanguageDebugState {
  if (typeof window === "undefined") {
    return {
      htmlLang: "unavailable",
      navigatorLanguage: "unavailable",
      navigatorLanguages: "unavailable",
      storedLocale: "unavailable",
      storedSource: "unavailable",
      cookieLocale: "unavailable",
      cookieSource: "unavailable"
    };
  }

  return {
    htmlLang: document.documentElement.lang || "none",
    navigatorLanguage: window.navigator.language || "none",
    navigatorLanguages: Array.isArray(window.navigator.languages) ? window.navigator.languages.join(", ") : "none",
    storedLocale: window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? "none",
    storedSource: window.localStorage.getItem(LOCALE_SOURCE_STORAGE_KEY) ?? "none",
    cookieLocale: readCookie(LOCALE_COOKIE_NAME) ?? "none",
    cookieSource: readCookie(LOCALE_SOURCE_COOKIE_NAME) ?? "none"
  };
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}
