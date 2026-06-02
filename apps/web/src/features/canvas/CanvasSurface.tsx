"use client";

import { useEffect, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { AppTopBar, usePageTransitionNavigation } from "../../shared/components/chrome";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { CanvasSidebar } from "../canvases/CanvasSidebar";
import { CanvasLeaseBlocker } from "../canvas-session/CanvasLeaseBlocker";
import { CanvasSessionProvider } from "../canvas-session/CanvasSessionProvider";
import { useCanvasSession } from "../canvas-session/CanvasSessionProvider";
import { CANVAS_SIDEBAR_OPEN_COOKIE, CANVAS_SIDEBAR_OPEN_STORAGE_KEY } from "./sidebarPreference";
import { CanvasView } from "./CanvasView";

export type CanvasTransitionNavigateOptions = {
  replace?: boolean;
};

const CANVAS_SWITCH_LEAVE_MS = 90;

export function CanvasSurface({ initialSidebarOpen, canvasId }: { initialSidebarOpen: boolean; canvasId: string }) {
  const { messages } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [isPreparingCanvasSwitch, setIsPreparingCanvasSwitch] = useState(false);
  const [pendingCanvasId, setPendingCanvasId] = useState<string | null>(null);
  const [resetViewportRequest, setResetViewportRequest] = useState(0);

  function toggleSidebar() {
    setIsSidebarOpen(value => {
      const nextValue = !value;
      storeSidebarOpen(nextValue);
      return nextValue;
    });
  }

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label={messages.canvas.canvas}>
      <CanvasSessionProvider canvasId={canvasId}>
        <CanvasSurfaceContent
          canvasId={canvasId}
          isSidebarOpen={isSidebarOpen}
          isPreparingCanvasSwitch={isPreparingCanvasSwitch}
          pendingCanvasId={pendingCanvasId}
          resetViewportRequest={resetViewportRequest}
          onToggleSidebar={toggleSidebar}
          onResetViewportRequest={() => setResetViewportRequest(value => value + 1)}
          onCanvasSwitchReady={() => {
            setIsPreparingCanvasSwitch(false);
            setPendingCanvasId(null);
          }}
          onCanvasSwitchStart={async targetCanvasId => {
            setPendingCanvasId(targetCanvasId);
            setIsPreparingCanvasSwitch(true);
            await new Promise(resolve => window.setTimeout(resolve, CANVAS_SWITCH_LEAVE_MS));
          }}
        />
      </CanvasSessionProvider>
    </main>
  );
}

function storeSidebarOpen(isOpen: boolean): void {
  try {
    window.localStorage.setItem(CANVAS_SIDEBAR_OPEN_STORAGE_KEY, String(isOpen));
  } catch {
    // Sidebar persistence is a convenience; interaction should still work if storage is unavailable.
  }
  document.cookie = `${CANVAS_SIDEBAR_OPEN_COOKIE}=${String(isOpen)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function CanvasSurfaceContent({
  canvasId,
  isSidebarOpen,
  isPreparingCanvasSwitch,
  pendingCanvasId,
  resetViewportRequest,
  onToggleSidebar,
  onResetViewportRequest,
  onCanvasSwitchReady,
  onCanvasSwitchStart
}: {
  canvasId: string;
  isSidebarOpen: boolean;
  isPreparingCanvasSwitch: boolean;
  pendingCanvasId: string | null;
  resetViewportRequest: number;
  onToggleSidebar(): void;
  onResetViewportRequest(): void;
  onCanvasSwitchReady(): void;
  onCanvasSwitchStart(targetCanvasId: string): Promise<void>;
}) {
  const { messages } = useLocale();
  const navigation = usePageTransitionNavigation();
  const { retryLease, state } = useCanvasSession();

  useEffect(() => {
    if (!pendingCanvasId) return;
    if (canvasId !== pendingCanvasId) return;
    if (state.snapshot?.canvas.id !== pendingCanvasId) return;
    onCanvasSwitchReady();
  }, [onCanvasSwitchReady, pendingCanvasId, state.snapshot?.canvas.id, canvasId]);

  return (
    <>
      <AppTopBar onCanvasLogoClick={onResetViewportRequest} />
      <CanvasSidebar
        currentCanvasId={canvasId}
        isOpen={isSidebarOpen}
        onToggle={onToggleSidebar}
        onCanvasNavigate={async (targetCanvasId, options) => {
          if (targetCanvasId === canvasId) return;
          await navigation.navigate(`/canvases/${targetCanvasId}`, {
            ...(options?.replace === undefined ? {} : { replace: options.replace }),
            beforeNavigate: () => onCanvasSwitchStart(targetCanvasId)
          });
        }}
      />
      <section className="canvas-stage" aria-label={messages.canvas.stage}>
        <CanvasView
          isPreparingCanvasSwitch={isPreparingCanvasSwitch}
          isSidebarOpen={isSidebarOpen}
          resetViewportRequest={resetViewportRequest}
          routeCanvasId={canvasId}
        />
        <CanvasLeaseBlocker
          isVisible={state.leaseState === "blocked-stale" || state.leaseState === "recovering"}
          isRecovering={state.leaseState === "recovering"}
          messageKey={state.errorMessageKey}
          onRetry={() => {
            void retryLease();
          }}
        />
      </section>
      <DebugCanvasSource
        page="canvas"
        canvasId={canvasId}
        leaseState={state.leaseState}
        pendingClientMutationCount={state.pendingClientMutationIds.length}
        snapshot={state.snapshot}
      />
    </>
  );
}
