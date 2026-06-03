"use client";

import type { Canvas } from "@inquara/domain";
import { useEffect, useState } from "react";
import { LoginPage } from "../auth/LoginPage";
import { apiJson } from "../../shared/api";
import { usePageTransitionNavigation } from "../../shared/components/chrome";
import { LoadingState } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";

export function CanvasListPage() {
  const { messages } = useLocale();
  const navigation = usePageTransitionNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void openCanvas();
  }, []);

  async function openCanvas() {
    setIsLoading(true);
    setError("");
    try {
      const items = await apiJson<Canvas[]>("/canvases");
      setNeedsLogin(false);
      await navigation.replace(items[0] ? `/canvases/${items[0].id}` : "/canvases/new");
    } catch {
      setNeedsLogin(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="canvas-panel canvas-loading-panel">
          <LoadingState variant="page" aria-label={messages.canvasList.openingCanvas} />
        </section>
      </main>
    );
  }

  if (needsLogin) {
    return <LoginPage onLoggedIn={openCanvas} />;
  }

  return (
    <main className="app-shell">
      <section className="canvas-panel canvas-loading-panel">
        <LoadingState variant="page" aria-label={messages.canvasList.openingCanvas} />
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
