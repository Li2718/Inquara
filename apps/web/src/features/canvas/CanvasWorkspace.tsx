"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { AppTopBar } from "../../shared/components/chrome";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasView } from "./CanvasView";

const WORKSPACE_SWITCH_LEAVE_MS = 90;

export type WorkspaceTransitionNavigateOptions = {
  replace?: boolean;
};

export function CanvasWorkspace({ workspaceId }: { workspaceId: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPreparingWorkspaceSwitch, setIsPreparingWorkspaceSwitch] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);
  const [resetViewportRequest, setResetViewportRequest] = useState(0);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label="Canvas workspace">
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <CanvasWorkspaceContent
          workspaceId={workspaceId}
          isSidebarOpen={isSidebarOpen}
          isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
          pendingWorkspaceId={pendingWorkspaceId}
          resetViewportRequest={resetViewportRequest}
          onToggleSidebar={() => setIsSidebarOpen(value => !value)}
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
  const router = useRouter();
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
          await navigateWithWorkspaceTransition(router, targetWorkspaceId, onWorkspaceSwitchStart, options);
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

export async function navigateWithWorkspaceTransition(
  router: ReturnType<typeof useRouter>,
  targetWorkspaceId: string,
  startTransition: (targetWorkspaceId: string) => Promise<void>,
  options: WorkspaceTransitionNavigateOptions = {}
) {
  await startTransition(targetWorkspaceId);
  const href = `/workspaces/${targetWorkspaceId}`;
  if (options.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}
