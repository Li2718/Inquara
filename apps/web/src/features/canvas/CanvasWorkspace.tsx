"use client";

import type { Workspace } from "@inquara/domain";
import React, { useEffect, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { AppTopBar } from "../../shared/components/chrome";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { NewCanvasEntry } from "../workspaces/NewCanvasEntry";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { clearPendingStarterMessage } from "../workspaces/newCanvasDraft";
import { WorkspaceLeaseBlocker } from "../workspace-session/WorkspaceLeaseBlocker";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { parseCanvasPathState, writeCanvasPathState, type CanvasPathState } from "./canvasUrlState";
import {
  advanceNewCanvasTransition,
  hasVisibleStarterMessage,
  initialNewCanvasTransitionState,
  type NewCanvasTransitionState
} from "./newCanvasTransition";
import { WORKSPACE_SIDEBAR_OPEN_COOKIE, WORKSPACE_SIDEBAR_OPEN_STORAGE_KEY } from "./sidebarPreference";
import { CanvasView } from "./CanvasView";

export type WorkspaceTransitionNavigateOptions = {
  replace?: boolean;
};

const WORKSPACE_SWITCH_LEAVE_MS = 90;

export function CanvasWorkspace({ initialSidebarOpen, workspaceId }: { initialSidebarOpen: boolean; workspaceId: string }) {
  const { messages } = useLocale();
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [activeState, setActiveState] = useState<CanvasPathState>(() =>
    workspaceId === "new" ? { mode: "new" } : { mode: "workspace", workspaceId }
  );
  const [isPreparingWorkspaceSwitch, setIsPreparingWorkspaceSwitch] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);
  const [pendingStarterSubmission, setPendingStarterSubmission] = useState<{ content: string; workspaceId: string } | null>(null);
  const [createdWorkspaceForSidebar, setCreatedWorkspaceForSidebar] = useState<Workspace | null>(null);
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
    setPendingWorkspaceId(null);
    setPendingStarterSubmission(null);
    setIsPreparingWorkspaceSwitch(false);
    setNewCanvasTransition(advanceNewCanvasTransition(initialNewCanvasTransitionState, { type: "reset" }));
    setActiveState({ mode: "new" });
    writeCanvasPathState({ mode: "new" }, options);
  }

  async function showWorkspace(targetWorkspaceId: string, options: { replace?: boolean } = {}) {
    if (activeState.mode === "workspace" && activeState.workspaceId === targetWorkspaceId) return;
    setPendingWorkspaceId(targetWorkspaceId);
    setIsPreparingWorkspaceSwitch(true);
    setActiveState({ mode: "workspace", workspaceId: targetWorkspaceId });
    writeCanvasPathState({ mode: "workspace", workspaceId: targetWorkspaceId }, options);
    await new Promise(resolve => window.setTimeout(resolve, WORKSPACE_SWITCH_LEAVE_MS));
  }

  useEffect(() => {
    function handlePopState() {
      const nextState = parseCanvasPathState(window.location.pathname);
      if (!nextState) return;
      setPendingWorkspaceId(nextState.mode === "workspace" ? nextState.workspaceId : null);
      setIsPreparingWorkspaceSwitch(nextState.mode === "workspace");
      setActiveState(nextState);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label={messages.canvas.workspace}>
      <AppTopBar
        isCanvasSurface
        onCanvasLogoClick={() => {
          if (activeState.mode === "workspace") {
            setResetViewportRequest(value => value + 1);
            return;
          }
          showNewCanvas();
        }}
        onNewCanvasRequest={() => showNewCanvas()}
      />
      <WorkspaceSidebar
        createdWorkspace={createdWorkspaceForSidebar}
        currentWorkspaceId={activeState.mode === "workspace" ? activeState.workspaceId : "new"}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onNewCanvasRequest={() => showNewCanvas()}
        onWorkspaceNavigate={(targetWorkspaceId, options) => showWorkspace(targetWorkspaceId, options)}
      />
      {activeState.mode === "new" ? (
        <section className="canvas-stage new-canvas-stage" aria-label={messages.canvas.stage}>
          <NewCanvasEntry
            onCreated={async ({ content, workspace }) => {
              setNewCanvasTransition(
                advanceNewCanvasTransition(initialNewCanvasTransitionState, {
                  content,
                  type: "submitted",
                  workspaceId: workspace.id
                })
              );
              setPendingStarterSubmission({ content, workspaceId: workspace.id });
              setCreatedWorkspaceForSidebar(workspace);
              await showWorkspace(workspace.id, { replace: true });
            }}
          />
        </section>
      ) : (
        <WorkspaceSessionProvider
          workspaceId={activeState.workspaceId}
          initialStarterMessage={
            pendingStarterSubmission?.workspaceId === activeState.workspaceId ? pendingStarterSubmission.content : null
          }
          onInitialStarterMessageSent={workspaceId => {
            clearPendingStarterMessage(workspaceId);
            setPendingStarterSubmission(current => (current?.workspaceId === workspaceId ? null : current));
          }}
        >
          <CanvasWorkspaceContent
            workspaceId={activeState.workspaceId}
            isSidebarOpen={isSidebarOpen}
            isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
            pendingWorkspaceId={pendingWorkspaceId}
            resetViewportRequest={resetViewportRequest}
            transitionWorkspaceId={newCanvasTransition.status === "morphing" ? newCanvasTransition.workspaceId : null}
            transitionContent={newCanvasTransition.status === "morphing" ? newCanvasTransition.content : ""}
            onStarterTransitionReady={workspaceId => {
              setNewCanvasTransition(state =>
                advanceNewCanvasTransition(state, {
                  type: "starterMessageVisible",
                  workspaceId
                })
              );
            }}
            onWorkspaceSwitchReady={() => {
              setIsPreparingWorkspaceSwitch(false);
              setPendingWorkspaceId(null);
            }}
          />
        </WorkspaceSessionProvider>
      )}
      {newCanvasTransition.status === "morphing" ? (
        <NewCanvasMorphOverlay content={newCanvasTransition.content} sendLabel={messages.chat.send} />
      ) : null}
    </main>
  );
}

function storeSidebarOpen(isOpen: boolean): void {
  try {
    window.localStorage.setItem(WORKSPACE_SIDEBAR_OPEN_STORAGE_KEY, String(isOpen));
  } catch {
    // Sidebar persistence is a convenience; interaction should still work if storage is unavailable.
  }
  document.cookie = `${WORKSPACE_SIDEBAR_OPEN_COOKIE}=${String(isOpen)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function CanvasWorkspaceContent({
  workspaceId,
  isSidebarOpen,
  isPreparingWorkspaceSwitch,
  pendingWorkspaceId,
  resetViewportRequest,
  transitionWorkspaceId,
  transitionContent,
  onStarterTransitionReady,
  onWorkspaceSwitchReady
}: {
  workspaceId: string;
  isSidebarOpen: boolean;
  isPreparingWorkspaceSwitch: boolean;
  pendingWorkspaceId: string | null;
  resetViewportRequest: number;
  transitionWorkspaceId: string | null;
  transitionContent: string;
  onStarterTransitionReady(workspaceId: string): void;
  onWorkspaceSwitchReady(): void;
}) {
  const { messages } = useLocale();
  const { refreshSnapshot, state } = useWorkspaceSession();

  useEffect(() => {
    if (!pendingWorkspaceId) return;
    if (workspaceId !== pendingWorkspaceId) return;
    if (state.snapshot?.workspace.id !== pendingWorkspaceId) return;
    onWorkspaceSwitchReady();
  }, [onWorkspaceSwitchReady, pendingWorkspaceId, state.snapshot?.workspace.id, workspaceId]);

  useEffect(() => {
    if (state.leaseState !== "active") return;
    if (!transitionWorkspaceId) return;
    if (!hasVisibleStarterMessage(state.snapshot, { content: transitionContent, workspaceId: transitionWorkspaceId })) {
      const timeout = window.setTimeout(() => {
        void refreshSnapshot();
      }, 500);
      return () => window.clearTimeout(timeout);
    }
    const timeout = window.setTimeout(() => onStarterTransitionReady(transitionWorkspaceId), 220);
    return () => window.clearTimeout(timeout);
  }, [onStarterTransitionReady, refreshSnapshot, state.leaseState, state.snapshot, transitionContent, transitionWorkspaceId]);

  return (
    <>
      <section className="canvas-stage" aria-label={messages.canvas.stage}>
        <CanvasView
          isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
          isSidebarOpen={isSidebarOpen}
          resetViewportRequest={resetViewportRequest}
          routeWorkspaceId={workspaceId}
        />
        <WorkspaceLeaseBlocker
          isVisible={state.leaseState === "blocked-stale" || state.leaseState === "recovering"}
          isRecovering={state.leaseState === "recovering"}
          messageKey={state.errorMessageKey}
          onRetry={() => window.location.reload()}
        />
      </section>
      <DebugCanvasSource
        page="canvas"
        workspaceId={workspaceId}
        leaseState={state.leaseState}
        pendingClientMutationCount={state.pendingClientMutationIds.length}
        snapshot={state.snapshot}
      />
    </>
  );
}

export function NewCanvasMorphOverlay({ content, sendLabel }: { content: string; sendLabel: string }) {
  return (
    <div className="new-canvas-morph-overlay" aria-hidden="true">
      <div className="new-canvas-morph-node">
        <div className="new-canvas-morph-node-header" />
        <div className="new-canvas-morph-node-body" />
        <div className="new-canvas-morph-composer">
          <div className="new-canvas-morph-input">{content}</div>
          <div className="new-canvas-morph-send">{sendLabel}</div>
        </div>
      </div>
    </div>
  );
}
