"use client";

import { useEffect, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { AppTopBar, usePageTransitionNavigation } from "../../shared/components/chrome";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { WORKSPACE_SIDEBAR_OPEN_COOKIE, WORKSPACE_SIDEBAR_OPEN_STORAGE_KEY } from "./sidebarPreference";
import { CanvasView } from "./CanvasView";

export type WorkspaceTransitionNavigateOptions = {
  replace?: boolean;
};

const WORKSPACE_SWITCH_LEAVE_MS = 90;

export function CanvasWorkspace({ initialSidebarOpen, workspaceId }: { initialSidebarOpen: boolean; workspaceId: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarOpen);
  const [isPreparingWorkspaceSwitch, setIsPreparingWorkspaceSwitch] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);
  const [resetViewportRequest, setResetViewportRequest] = useState(0);

  function toggleSidebar() {
    setIsSidebarOpen(value => {
      const nextValue = !value;
      storeSidebarOpen(nextValue);
      return nextValue;
    });
  }

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label="Canvas workspace">
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <CanvasWorkspaceContent
          workspaceId={workspaceId}
          isSidebarOpen={isSidebarOpen}
          isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
          pendingWorkspaceId={pendingWorkspaceId}
          resetViewportRequest={resetViewportRequest}
          onToggleSidebar={toggleSidebar}
          onResetViewportRequest={() => setResetViewportRequest(value => value + 1)}
          onWorkspaceSwitchReady={() => {
            setIsPreparingWorkspaceSwitch(false);
            setPendingWorkspaceId(null);
          }}
          onWorkspaceSwitchStart={async targetWorkspaceId => {
            setPendingWorkspaceId(targetWorkspaceId);
            setIsPreparingWorkspaceSwitch(true);
            await new Promise(resolve => window.setTimeout(resolve, WORKSPACE_SWITCH_LEAVE_MS));
          }}
        />
      </WorkspaceSessionProvider>
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
  onToggleSidebar,
  onResetViewportRequest,
  onWorkspaceSwitchReady,
  onWorkspaceSwitchStart
}: {
  workspaceId: string;
  isSidebarOpen: boolean;
  isPreparingWorkspaceSwitch: boolean;
  pendingWorkspaceId: string | null;
  resetViewportRequest: number;
  onToggleSidebar(): void;
  onResetViewportRequest(): void;
  onWorkspaceSwitchReady(): void;
  onWorkspaceSwitchStart(targetWorkspaceId: string): Promise<void>;
}) {
  const navigation = usePageTransitionNavigation();
  const { state } = useWorkspaceSession();

  useEffect(() => {
    if (!pendingWorkspaceId) return;
    if (workspaceId !== pendingWorkspaceId) return;
    if (state.snapshot?.workspace.id !== pendingWorkspaceId) return;
    onWorkspaceSwitchReady();
  }, [onWorkspaceSwitchReady, pendingWorkspaceId, state.snapshot?.workspace.id, workspaceId]);

  return (
    <>
      <AppTopBar onCanvasLogoClick={onResetViewportRequest} />
      <WorkspaceSidebar
        currentWorkspaceId={workspaceId}
        isOpen={isSidebarOpen}
        onToggle={onToggleSidebar}
        onWorkspaceNavigate={async (targetWorkspaceId, options) => {
          if (targetWorkspaceId === workspaceId) return;
          await navigation.navigate(`/workspaces/${targetWorkspaceId}`, {
            ...(options?.replace === undefined ? {} : { replace: options.replace }),
            beforeNavigate: () => onWorkspaceSwitchStart(targetWorkspaceId)
          });
        }}
      />
      <section className="canvas-stage" aria-label="Canvas">
        <CanvasView
          isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
          isSidebarOpen={isSidebarOpen}
          resetViewportRequest={resetViewportRequest}
          routeWorkspaceId={workspaceId}
        />
      </section>
      <DebugCanvasSource
        page="canvas"
        workspaceId={workspaceId}
        connectionStatus={state.connectionStatus}
        pendingClientMutationCount={state.pendingClientMutationIds.length}
        snapshot={state.snapshot}
      />
    </>
  );
}
