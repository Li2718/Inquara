"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DebugCanvasSource } from "../../debug/DebugCanvasSource";
import { apiJson } from "../../shared/api";
import { ConfirmDialog, FloatingCircleButton, PopupMenu, PopupMenuItem } from "../../shared/components/ui";
import { WorkspaceSidebar } from "../workspaces/WorkspaceSidebar";
import { WorkspaceSessionProvider } from "../workspace-session/WorkspaceSessionProvider";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasView } from "./CanvasView";

const WORKSPACE_SWITCH_LEAVE_MS = 90;

export type WorkspaceTransitionNavigateOptions = {
  replace?: boolean;
};

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
  const router = useRouter();
  const { state } = useWorkspaceSession();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null);

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

  async function logOut() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiJson<void>("/auth/logout", { method: "POST" });
      router.replace("/");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

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
        <FloatingCircleButton
          ref={accountMenuTriggerRef}
          className="canvas-account-button"
          size="md"
          aria-label={`Account: ${userLabel}`}
          aria-expanded={isAccountMenuOpen}
          aria-haspopup="menu"
          title={userLabel}
          onClick={() => setIsAccountMenuOpen(value => !value)}
        >
          <span>{userInitial}</span>
        </FloatingCircleButton>
        <PopupMenu
          className="canvas-account-menu"
          aria-label="Account menu"
          ignoreRef={accountMenuTriggerRef}
          isOpen={isAccountMenuOpen}
          onClose={() => setIsAccountMenuOpen(false)}
          placement="bottom-end"
        >
          <PopupMenuItem
            tone="danger"
            onClick={() => {
              setIsAccountMenuOpen(false);
              setIsLogoutDialogOpen(true);
            }}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Log out"}
          </PopupMenuItem>
        </PopupMenu>
      </div>
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Log out?"
        description="You will need to sign in again on this device."
        confirmLabel={isLoggingOut ? "Logging out..." : "Log out"}
        confirmTone="danger"
        isConfirming={isLoggingOut}
        onCancel={() => setIsLogoutDialogOpen(false)}
        onConfirm={logOut}
      />
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
