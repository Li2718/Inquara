"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  navigateWithPageTransition,
  runWithPageTransition,
  type PageTransitionNavigateOptions
} from "./pageTransitionNavigation";

type RunNavigationOptions = {
  document?: Document;
  window?: Window;
};

export function usePageTransitionNavigation() {
  const router = useRouter();

  return useMemo(
    () => ({
      navigate(href: string, options: PageTransitionNavigateOptions = {}) {
        return navigateWithPageTransition(router, href, options);
      },
      push(href: string, options: Omit<PageTransitionNavigateOptions, "replace"> = {}) {
        return navigateWithPageTransition(router, href, options);
      },
      replace(href: string, options: Omit<PageTransitionNavigateOptions, "replace"> = {}) {
        return navigateWithPageTransition(router, href, {
          ...options,
          replace: true
        });
      },
      run(update: () => void | Promise<void>, options: RunNavigationOptions = {}) {
        return runWithPageTransition(update, options);
      },
      router
    }),
    [router]
  );
}
