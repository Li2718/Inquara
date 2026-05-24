"use client";

import { useState } from "react";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { WorkspaceSessionStatus } from "../workspace-session/WorkspaceSessionStatus";
import { CanvasView } from "./CanvasView";

export function CanvasWorkspace({ workspaceId }: { workspaceId: string }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <main className="canvas-page" data-sidebar-open={isSidebarOpen} aria-label="Canvas workspace">
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <WorkspaceSidebar
          currentWorkspaceId={workspaceId}
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(value => !value)}
        />
        <section className="canvas-stage" aria-label="Canvas">
          <CanvasView />
          <div className="canvas-status-overlay" aria-label="Canvas status">
            <WorkspaceSessionStatus />
          </div>
        </section>
      </WorkspaceSessionProvider>
    </main>
  );
}
