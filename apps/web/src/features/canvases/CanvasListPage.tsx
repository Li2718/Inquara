"use client";

import type { Canvas } from "@inquara/domain";
import { useEffect, useState } from "react";
import { LoginPage } from "../auth/LoginPage";
import { apiJson } from "../../shared/api";
import { usePageTransitionNavigation } from "../../shared/components/chrome";
import { ErrorScreen } from "../../shared/components/product";
import { LoadingState } from "../../shared/components/ui";
import { getCanvasListFailureAction } from "./canvasListFailure";
import { getCanvasListViewState } from "./canvasListViewState";

export function CanvasListPage() {
  const navigation = usePageTransitionNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [fatalError, setFatalError] = useState<Error | null>(null);

  useEffect(() => {
    void openCanvas({ requireLoginOnFailure: true });
  }, []);

  async function openCanvas({ requireLoginOnFailure = false }: { requireLoginOnFailure?: boolean } = {}) {
    setIsLoading(true);
    setFatalError(null);
    if (!requireLoginOnFailure) {
      setNeedsLogin(false);
    }
    try {
      const items = await apiJson<Canvas[]>("/canvases");
      setNeedsLogin(false);
      await navigation.replace(items[0] ? `/canvases/${items[0].id}` : "/canvases/new");
    } catch (error) {
      const action = getCanvasListFailureAction({ error, requireLoginOnFailure });
      if (action === "show-login") {
        setNeedsLogin(true);
        return;
      }
      setNeedsLogin(false);
      setFatalError(error instanceof Error ? error : new Error("Could not open canvas."));
    } finally {
      setIsLoading(false);
    }
  }

  const viewState = getCanvasListViewState({ isLoading, needsLogin });

  if (fatalError) {
    return <ErrorScreen onRetry={() => void openCanvas({ requireLoginOnFailure: true })} />;
  }

  if (viewState === "login") {
    return <LoginPage onLoggedIn={() => openCanvas()} />;
  }

  if (viewState === "loading") {
    return (
      <main className="app-shell">
        <section className="canvas-panel canvas-loading-panel">
          <LoadingState variant="page" />
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="canvas-panel canvas-loading-panel">
        <LoadingState variant="page" />
      </section>
    </main>
  );
}
