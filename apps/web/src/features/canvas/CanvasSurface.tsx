"use client";

import type { Canvas } from "@inquara/domain";
import React from "react";
import { useEffect, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { AppTopBar } from "../../shared/components/chrome";
import { NodeComposerDisplay, NodeComposerFrame, NodeComposerSubmit } from "../../shared/components/domain";
import { MoreVerticalIcon } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { CanvasLeaseBlocker } from "../canvas-session/CanvasLeaseBlocker";
import { CanvasSessionProvider, useCanvasSession } from "../canvas-session/CanvasSessionProvider";
import { CanvasSidebar } from "../canvases/CanvasSidebar";
import { NewCanvasEntry } from "../canvases/NewCanvasEntry";
import { clearPendingStarterMessage, getPendingStarterMessage } from "../canvases/newCanvasDraft";
import { MessageBubble } from "../node-chat/MessageList";
import { CANVAS_SIDEBAR_OPEN_COOKIE, CANVAS_SIDEBAR_OPEN_STORAGE_KEY } from "./sidebarPreference";
import { CanvasView } from "./CanvasView";
import { parseCanvasPathState, writeCanvasPathState, type CanvasPathState } from "./canvasUrlState";
import {
  advanceNewCanvasTransition,
  canSettleStarterTransition,
  hasRenderedStarterMessage,
  initialNewCanvasTransitionState,
  type NewCanvasTransitionState
} from "./newCanvasTransition";

export type CanvasTransitionNavigateOptions = {
  replace?: boolean;
};

const CANVAS_SWITCH_LEAVE_MS = 90;

export function CanvasSurface({ initialSidebarOpen, canvasId }: { initialSidebarOpen: boolean; canvasId: string }) {
  const { messages } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [activeState, setActiveState] = useState<CanvasPathState>(() =>
    canvasId === "new" ? { mode: "new" } : { canvasId, mode: "canvas" }
  );
  const [isPreparingCanvasSwitch, setIsPreparingCanvasSwitch] = useState(false);
  const [pendingCanvasId, setPendingCanvasId] = useState<string | null>(null);
  const [pendingStarterSubmission, setPendingStarterSubmission] = useState<{ canvasId: string; content: string } | null>(null);
  const [updatedCanvasForSidebar, setUpdatedCanvasForSidebar] = useState<Canvas | null>(null);
  const [newCanvasTransition, setNewCanvasTransition] = useState<NewCanvasTransitionState>(initialNewCanvasTransitionState);
  const [resetViewportRequest, setResetViewportRequest] = useState(0);

  function toggleSidebar() {
    setIsSidebarOpen(value => {
      const nextValue = !value;
      storeSidebarOpen(nextValue);
      return nextValue;
    });
  }

  function showNewCanvas(options: { replace?: boolean } = {}) {
    setPendingCanvasId(null);
    setPendingStarterSubmission(null);
    setIsPreparingCanvasSwitch(false);
    setNewCanvasTransition(advanceNewCanvasTransition(initialNewCanvasTransitionState, { type: "reset" }));
    setActiveState({ mode: "new" });
    writeCanvasPathState({ mode: "new" }, options);
  }

  async function showCanvas(targetCanvasId: string, options: { replace?: boolean } = {}) {
    if (activeState.mode === "canvas" && activeState.canvasId === targetCanvasId) return;
    setPendingCanvasId(targetCanvasId);
    setIsPreparingCanvasSwitch(true);
    setActiveState({ canvasId: targetCanvasId, mode: "canvas" });
    writeCanvasPathState({ canvasId: targetCanvasId, mode: "canvas" }, options);
    await new Promise(resolve => window.setTimeout(resolve, CANVAS_SWITCH_LEAVE_MS));
  }

  useEffect(() => {
    function handlePopState() {
      const nextState = parseCanvasPathState(window.location.pathname);
      if (!nextState) return;
      setPendingCanvasId(nextState.mode === "canvas" ? nextState.canvasId : null);
      setIsPreparingCanvasSwitch(nextState.mode === "canvas");
      setActiveState(nextState);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label={messages.canvas.canvas}>
      <AppTopBar
        isCanvasSurface
        onCanvasLogoClick={() => {
          if (activeState.mode === "canvas") {
            setResetViewportRequest(value => value + 1);
            return;
          }
          showNewCanvas();
        }}
        onNewCanvasRequest={() => showNewCanvas()}
      />
      <CanvasSidebar
        updatedCanvas={updatedCanvasForSidebar}
        currentCanvasId={activeState.mode === "canvas" ? activeState.canvasId : "new"}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onNewCanvasRequest={() => showNewCanvas()}
        onCanvasNavigate={(targetCanvasId, options) => showCanvas(targetCanvasId, options)}
      />
      {activeState.mode === "new" ? (
        <section className="canvas-stage new-canvas-stage" aria-label={messages.canvas.stage}>
          <NewCanvasEntry
            isOverlayVisible={newCanvasTransition.status === "morphing" || newCanvasTransition.status === "settling"}
            onSubmitted={({ content, submissionId }) => {
              setNewCanvasTransition(
                advanceNewCanvasTransition(initialNewCanvasTransitionState, {
                  content,
                  submissionId,
                  type: "submitted"
                })
              );
            }}
            onCreated={async ({ canvas, content, submissionId }) => {
              setNewCanvasTransition(state =>
                advanceNewCanvasTransition(state, {
                  canvasId: canvas.id,
                  submissionId,
                  type: "canvasCreated"
                })
              );
              setPendingStarterSubmission({ canvasId: canvas.id, content });
              setUpdatedCanvasForSidebar(canvas);
              await showCanvas(canvas.id, { replace: true });
            }}
          />
        </section>
      ) : (
        <CanvasSessionProvider
          canvasId={activeState.canvasId}
          initialStarterMessage={
            pendingStarterSubmission?.canvasId === activeState.canvasId
              ? pendingStarterSubmission.content
              : getPendingStarterMessage(activeState.canvasId)
          }
          onInitialStarterMessageSent={canvasId => {
            setPendingStarterSubmission(current => (current?.canvasId === canvasId ? null : current));
          }}
        >
          <CanvasSurfaceContent
            canvasId={activeState.canvasId}
            isSidebarOpen={isSidebarOpen}
            isPreparingCanvasSwitch={isPreparingCanvasSwitch}
            pendingCanvasId={pendingCanvasId}
            resetViewportRequest={resetViewportRequest}
            transitionCanvasId={
              newCanvasTransition.status === "morphing" || newCanvasTransition.status === "settling"
                ? newCanvasTransition.canvasId
                : null
            }
            transitionStatus={
              newCanvasTransition.status === "morphing" || newCanvasTransition.status === "settling"
                ? newCanvasTransition.status
                : "idle"
            }
            transitionContent={
              newCanvasTransition.status === "morphing" || newCanvasTransition.status === "settling"
                ? newCanvasTransition.content
                : ""
            }
            onStarterTransitionReady={canvasId => {
              setNewCanvasTransition(state =>
                advanceNewCanvasTransition(state, {
                  canvasId,
                  type: "starterMessageVisible"
                })
              );
            }}
            onCanvasSwitchReady={() => {
              setIsPreparingCanvasSwitch(false);
              setPendingCanvasId(null);
            }}
            onCanvasSnapshotUpdated={setUpdatedCanvasForSidebar}
          />
        </CanvasSessionProvider>
      )}
      {newCanvasTransition.status === "morphing" || newCanvasTransition.status === "settling" ? (
        newCanvasTransition.status === "settling" ? (
          <NewCanvasMorphOverlay
            content={newCanvasTransition.content}
            sendLabel={messages.chat.send}
            state={newCanvasTransition.status}
            placeholder={messages.chat.askPlaceholder}
            thinkingLabel={messages.chat.thinking}
            onSettled={() => {
              setNewCanvasTransition(state =>
                advanceNewCanvasTransition(state, {
                  canvasId: newCanvasTransition.canvasId,
                  type: "overlaySettled"
                })
              );
            }}
          />
        ) : (
          <NewCanvasMorphOverlay
            content={newCanvasTransition.content}
            sendLabel={messages.chat.send}
            state={newCanvasTransition.status}
            placeholder={messages.chat.askPlaceholder}
            thinkingLabel={messages.chat.thinking}
          />
        )
      ) : null}
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
  transitionCanvasId,
  transitionStatus,
  transitionContent,
  onStarterTransitionReady,
  onCanvasSwitchReady,
  onCanvasSnapshotUpdated
}: {
  canvasId: string;
  isSidebarOpen: boolean;
  isPreparingCanvasSwitch: boolean;
  pendingCanvasId: string | null;
  resetViewportRequest: number;
  transitionCanvasId: string | null;
  transitionStatus: "idle" | "morphing" | "settling";
  transitionContent: string;
  onStarterTransitionReady(canvasId: string): void;
  onCanvasSwitchReady(): void;
  onCanvasSnapshotUpdated(canvas: Canvas): void;
}) {
  const { messages } = useLocale();
  const { refreshSnapshot, retryLease, state } = useCanvasSession();
  const [starterRenderWaitTick, setStarterRenderWaitTick] = useState(0);

  useEffect(() => {
    if (state.snapshot?.canvas) {
      onCanvasSnapshotUpdated(state.snapshot.canvas);
    }
  }, [onCanvasSnapshotUpdated, state.snapshot?.canvas]);

  useEffect(() => {
    if (!pendingCanvasId) return;
    if (canvasId !== pendingCanvasId) return;
    if (state.snapshot?.canvas.id !== pendingCanvasId) return;
    onCanvasSwitchReady();
  }, [onCanvasSwitchReady, pendingCanvasId, state.snapshot?.canvas.id, canvasId]);

  useEffect(() => {
    if (state.leaseState !== "active") return;
    if (!transitionCanvasId) return;
    const starter = { canvasId: transitionCanvasId, content: transitionContent };
    if (
      !canSettleStarterTransition({
        snapshot: state.snapshot,
        starter
      })
    ) {
      const timeout = window.setTimeout(() => {
        void refreshSnapshot();
      }, 500);
      return () => window.clearTimeout(timeout);
    }
    const renderedMessages = Array.from(document.querySelectorAll<HTMLElement>(".canvas-node-content .message-bubble.message-user")).map(
      element => element.textContent ?? ""
    );
    if (!hasRenderedStarterMessage(renderedMessages, transitionContent)) {
      const timeout = window.setTimeout(() => {
        setStarterRenderWaitTick(value => value + 1);
      }, 50);
      return () => window.clearTimeout(timeout);
    }
    clearPendingStarterMessage(transitionCanvasId);
    onStarterTransitionReady(transitionCanvasId);
  }, [
    onStarterTransitionReady,
    refreshSnapshot,
    state.leaseState,
    state.snapshot,
    starterRenderWaitTick,
    transitionContent,
    transitionCanvasId
  ]);

  return (
    <>
      <section className="canvas-stage" aria-label={messages.canvas.stage}>
        <CanvasView
          isPreparingCanvasSwitch={isPreparingCanvasSwitch}
          isSidebarOpen={isSidebarOpen}
          starterOverlayPhase={transitionCanvasId ? transitionStatus : "idle"}
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

export function NewCanvasMorphOverlay({
  content,
  onSettled,
  placeholder,
  sendLabel,
  state,
  thinkingLabel
}: {
  content: string;
  onSettled?: () => void;
  placeholder: string;
  sendLabel: string;
  state: "morphing" | "settling";
  thinkingLabel: string;
}) {
  return (
    <div
      className="new-canvas-morph-overlay"
      data-state={state}
      aria-hidden="true"
      onAnimationEnd={
        state === "settling"
          ? event => {
              if (event.currentTarget !== event.target) return;
              onSettled?.();
            }
          : undefined
      }
    >
      <div className="new-canvas-morph-node">
        <header className="canvas-node-header new-canvas-morph-node-header">
          <div className="canvas-node-title-row new-canvas-morph-title">
            <strong>{content}</strong>
            <button
              type="button"
              className="icon-button node-menu-trigger nodrag new-canvas-morph-menu-trigger"
              tabIndex={-1}
              aria-hidden="true"
              disabled
            >
              <MoreVerticalIcon />
            </button>
          </div>
          <div className="canvas-node-actions" />
        </header>
        <div className="node-chat-panel nodrag new-canvas-morph-chat-panel">
          <div className="message-list nodrag new-canvas-morph-node-body">
            <MessageBubble className="new-canvas-morph-user-message" content={content} role="user" />
            <MessageBubble className="new-canvas-morph-thinking-message" content={thinkingLabel} role="assistant" />
          </div>
          <NodeComposerFrame className="message-composer nodrag new-canvas-morph-composer">
            <NodeComposerDisplay className="new-canvas-morph-composer-input">
              {state === "settling" ? placeholder : ""}
            </NodeComposerDisplay>
            <NodeComposerSubmit disabled tabIndex={-1}>
              {sendLabel}
            </NodeComposerSubmit>
          </NodeComposerFrame>
        </div>
        <button
          type="button"
          className="canvas-node-resize-handle nodrag nowheel new-canvas-morph-resize-handle"
          aria-hidden="true"
          tabIndex={-1}
          disabled
        />
      </div>
    </div>
  );
}
