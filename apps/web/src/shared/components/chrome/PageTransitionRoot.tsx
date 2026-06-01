"use client";

import { useEffect } from "react";
import { startHistoryPageTransition } from "./pageTransitionNavigation";

export function PageTransitionRoot() {
  useEffect(() => {
    function handlePopState() {
      startHistoryPageTransition();
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return null;
}
