"use client";

import { useState } from "react";
import { DebugRoot } from "../../debug/DebugRoot";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasView } from "./CanvasView";

export function CanvasWorkspace({ workspaceId }: { workspaceId: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label="Canvas workspace">
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <CanvasWorkspaceContent
          workspaceId={workspaceId}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(value => !value)}
        />
      </WorkspaceSessionProvider>
    </main>
  );
}

function CanvasWorkspaceContent({
  workspaceId,
  isSidebarOpen,
  onToggleSidebar
}: {
  workspaceId: string;
  isSidebarOpen: boolean;
  onToggleSidebar(): void;
}) {
  const { state } = useWorkspaceSession();

  return (
    <>
      <WorkspaceSidebar
        currentWorkspaceId={workspaceId}
        isOpen={isSidebarOpen}
        onToggle={onToggleSidebar}
      />
      <section className="canvas-stage" aria-label="Canvas">
        <CanvasView />
      </section>
      <DebugRoot
        page="canvas"
        workspaceId={workspaceId}
        connectionStatus={state.connectionStatus}
        pendingClientMutationCount={state.pendingClientMutationIds.length}
        snapshot={state.snapshot}
      />
    </>
  );
}
