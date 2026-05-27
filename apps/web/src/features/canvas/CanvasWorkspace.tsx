"use client";

import { useEffect, useMemo, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { apiJson } from "../../shared/api";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasView } from "./CanvasView";

const WORKSPACE_SWITCH_LEAVE_MS = 90;

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

export function CanvasWorkspace({ workspaceId }: { workspaceId: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPreparingWorkspaceSwitch, setIsPreparingWorkspaceSwitch] = useState(false);
  const [pendingWorkspaceId, setPendingWorkspaceId] = useState<string | null>(null);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label="Canvas workspace">
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <CanvasWorkspaceContent
          workspaceId={workspaceId}
          isSidebarOpen={isSidebarOpen}
          isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
          pendingWorkspaceId={pendingWorkspaceId}
          onToggleSidebar={() => setIsSidebarOpen(value => !value)}
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
  onToggleSidebar,
  onWorkspaceSwitchReady,
  onWorkspaceSwitchStart
}: {
  workspaceId: string;
  isSidebarOpen: boolean;
  isPreparingWorkspaceSwitch: boolean;
  pendingWorkspaceId: string | null;
  onToggleSidebar(): void;
  onWorkspaceSwitchReady(): void;
  onWorkspaceSwitchStart(targetWorkspaceId: string): Promise<void>;
}) {
  const { state } = useWorkspaceSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!pendingWorkspaceId) return;
    if (workspaceId !== pendingWorkspaceId) return;
    if (state.snapshot?.workspace.id !== pendingWorkspaceId) return;
    onWorkspaceSwitchReady();
  }, [onWorkspaceSwitchReady, pendingWorkspaceId, state.snapshot?.workspace.id, workspaceId]);

  useEffect(() => {
    let isMounted = true;
    apiJson<CurrentUser>("/auth/me")
      .then(user => {
        if (isMounted) setCurrentUser(user);
      })
      .catch(() => {
        if (isMounted) setCurrentUser(null);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const userLabel = currentUser?.name || currentUser?.email || "Account";
  const userInitial = useMemo(() => {
    const source = currentUser?.name || currentUser?.email || "";
    return source.trim().slice(0, 1).toUpperCase() || "A";
  }, [currentUser]);

  return (
    <>
      <div className="canvas-brand" aria-label="Inquara">
        <span className="canvas-brand-name">
          Inquara
          <span className="canvas-brand-badge">Alpha</span>
        </span>
      </div>
      <div className="canvas-account">
        <button
          type="button"
          className="canvas-floating-circle-button canvas-account-button"
          data-size="md"
          aria-label={`Account: ${userLabel}`}
          title={userLabel}
        >
          <span>{userInitial}</span>
        </button>
      </div>
      <WorkspaceSidebar
        currentWorkspaceId={workspaceId}
        isOpen={isSidebarOpen}
        onToggle={onToggleSidebar}
        onWorkspaceSwitchStart={onWorkspaceSwitchStart}
      />
      <section className="canvas-stage" aria-label="Canvas">
        <CanvasView isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch} isSidebarOpen={isSidebarOpen} routeWorkspaceId={workspaceId} />
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
