"use client";

import { createContext, type ReactNode, useContext, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_MODE,
  type AppearanceMode,
  type AppearancePreference,
  resolveAppearanceMode
} from "./index";
import { applyAppearanceMode, createAppearanceCookieValue, readSystemAppearanceMode } from "./dom";

type AppearanceContextValue = {
  mode: AppearanceMode;
  preference: AppearancePreference;
  setPreference(preference: AppearancePreference): void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

function getSystemModeSnapshot(): AppearanceMode {
  return readSystemAppearanceMode(typeof window === "undefined" ? undefined : window.matchMedia.bind(window));
}

function subscribeToSystemMode(onStoreChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onStoreChange);
  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

export function AppearanceProvider({
  children,
  initialPreference
}: {
  children: ReactNode;
  initialPreference: AppearancePreference;
}) {
  const [preference, setPreferenceState] = useState<AppearancePreference>(initialPreference);
  const systemMode = useSyncExternalStore(subscribeToSystemMode, getSystemModeSnapshot, () => DEFAULT_APPEARANCE_MODE);
  const mode = resolveAppearanceMode(preference, systemMode);

  useEffect(() => {
    applyAppearanceMode(document.documentElement, mode);
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, preference);
    document.cookie = createAppearanceCookieValue(preference);
  }, [mode, preference]);

  const value = useMemo<AppearanceContextValue>(
    () => ({
      mode,
      preference,
      setPreference: setPreferenceState
    }),
    [mode, preference]
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value) throw new Error("useAppearance must be used within AppearanceProvider");
  return value;
}
