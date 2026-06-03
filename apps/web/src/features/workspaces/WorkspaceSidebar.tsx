"use client";

import type { Workspace } from "@inquara/domain";
import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { apiJson } from "../../shared/api";
import { PageTransitionLink } from "../../shared/components/chrome";
import {
  Button,
  ConfirmDialog,
  LoadingState,
  MoreVerticalIcon,
  PlusIcon,
  PopupMenu,
  PopupMenuItem,
  SkeletonBlock,
  SidebarCollapseIcon,
  SidebarPanelIcon
} from "../../shared/components/ui";
import { formatDate } from "../../shared/format";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { interpolate, type AppMessages } from "../../shared/messages";
import { getWorkspaceDeleteDialogOpeningState } from "./workspaceDeleteDialogState";
import { upsertWorkspaceList } from "./workspaceListState";

type WorkspaceSidebarProps = {
  createdWorkspace: Workspace | null;
  currentWorkspaceId: string;
  isOpen: boolean;
  onNewCanvasRequest(): void;
  onToggle(): void;
  onWorkspaceNavigate(targetWorkspaceId: string, options?: { replace?: boolean }): Promise<void>;
};

let workspaceListCache: Workspace[] | null = null;

export function WorkspaceSidebar({
  createdWorkspace,
  currentWorkspaceId,
  isOpen,
  onNewCanvasRequest,
  onToggle,
  onWorkspaceNavigate
}: WorkspaceSidebarProps) {
  const { locale, messages } = useLocale();
  const copy = messages.workspaceSidebar;
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => workspaceListCache ?? []);
  const [isLoading, setIsLoading] = useState(workspaceListCache === null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadWorkspaces({ showLoading: workspaceListCache === null });
  }, []);

  useEffect(() => {
    if (!createdWorkspace) return;
    setWorkspaces(previous => {
      const nextWorkspaces = upsertWorkspaceList(previous, createdWorkspace);
      workspaceListCache = nextWorkspaces;
      return nextWorkspaces;
    });
  }, [createdWorkspace]);

  async function loadWorkspaces({ showLoading }: { showLoading: boolean }) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const nextWorkspaces = await apiJson<Workspace[]>("/workspaces");
      workspaceListCache = nextWorkspaces;
      setWorkspaces(nextWorkspaces);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotLoad);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  async function createWorkspace() {
    setError("");
    onNewCanvasRequest();
  }

  function startRenaming(workspace: Workspace) {
    setActiveMenuId(null);
    setRenamingId(workspace.id);
    setRenameTitle(workspace.title);
    setError("");
  }

  function openDeleteDialog(workspace: Workspace) {
    const nextState = getWorkspaceDeleteDialogOpeningState(workspace);
    setActiveMenuId(nextState.activeMenuId);
    setIsDeleting(nextState.isDeleting);
    setDeletingWorkspace(nextState.deletingWorkspace);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>, workspace: Workspace) {
    event.preventDefault();
    const title = renameTitle.trim();
    if (!title) return;
    setError("");
    try {
      const updated = await apiJson<Workspace>(`/workspaces/${workspace.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title })
      });
      setWorkspaces(previous => {
        const nextWorkspaces = previous.map(item => (item.id === updated.id ? updated : item));
        workspaceListCache = nextWorkspaces;
        return nextWorkspaces;
      });
      setRenamingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotRename);
    }
  }

  async function confirmDeleteWorkspace() {
    if (!deletingWorkspace) return;
    setIsDeleting(true);
    setError("");
    try {
      await apiJson<void>(`/workspaces/${deletingWorkspace.id}`, { method: "DELETE" });
      const nextWorkspaces = workspaces.filter(item => item.id !== deletingWorkspace.id);
      workspaceListCache = nextWorkspaces;
      setWorkspaces(nextWorkspaces);
      setDeletingWorkspace(null);
      if (deletingWorkspace.id === currentWorkspaceId) {
        const nextWorkspace = nextWorkspaces[0];
        if (nextWorkspace) {
          await onWorkspaceNavigate(nextWorkspace.id, { replace: true });
        } else {
          onNewCanvasRequest();
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotDelete);
      setIsDeleting(false);
    }
  }

  return (
    <aside className="workspace-sidebar" data-open={isOpen} aria-label={copy.workspaceNavigation}>
      <button
        type="button"
        className="workspace-sidebar-morph-button"
        onClick={onToggle}
        aria-label={isOpen ? copy.collapseSidebar : copy.openSidebar}
        aria-expanded={isOpen}
      >
        <SidebarPanelIcon />
      </button>

      <div className="workspace-sidebar-content" aria-hidden={!isOpen}>
        <header className="workspace-sidebar-header">
          <button type="button" className="workspace-sidebar-title-button" onClick={onToggle} aria-label={copy.collapseSidebar}>
            <h2>{copy.canvases}</h2>
          </button>
          <button
            type="button"
            className="workspace-sidebar-create-button"
            onClick={createWorkspace}
            aria-label={copy.newCanvas}
          >
            <PlusIcon />
          </button>
          <button type="button" className="workspace-sidebar-collapse-button" onClick={onToggle} aria-label={copy.collapseSidebar}>
            <SidebarCollapseIcon />
          </button>
        </header>

        <div className="workspace-sidebar-list" aria-label={copy.canvasList}>
          {isLoading ? (
            <div className="workspace-sidebar-loading">
              <LoadingState variant="inline" aria-label={copy.loadingCanvases} />
              <SkeletonBlock variant="list" rows={3} />
            </div>
          ) : null}
          {!isLoading && workspaces.length === 0 ? (
            <p className="workspace-sidebar-note">{copy.noCanvases}</p>
          ) : null}
          {workspaces.map(workspace => (
            <WorkspaceSidebarItem
              key={workspace.id}
              activeMenuId={activeMenuId}
              currentWorkspaceId={currentWorkspaceId}
              onMenuToggle={setActiveMenuId}
              onRename={startRenaming}
              onWorkspaceNavigate={onWorkspaceNavigate}
              locale={locale}
              messages={messages}
              renamingId={renamingId}
              renameTitle={renameTitle}
              openDeleteDialog={openDeleteDialog}
              setRenameTitle={setRenameTitle}
              setRenamingId={setRenamingId}
              submitRename={submitRename}
              workspace={workspace}
            />
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deletingWorkspace)}
        title={copy.deleteCanvas}
        description={deletingWorkspace ? interpolate(copy.deleteDescription, { title: deletingWorkspace.title }) : undefined}
        confirmLabel={isDeleting ? messages.common.deleting : messages.common.delete}
        confirmTone="danger"
        isConfirming={isDeleting}
        onCancel={() => setDeletingWorkspace(null)}
        onConfirm={confirmDeleteWorkspace}
      />
    </aside>
  );
}

function WorkspaceSidebarItem({
  activeMenuId,
  currentWorkspaceId,
  onMenuToggle,
  onRename,
  onWorkspaceNavigate,
  locale,
  messages,
  openDeleteDialog,
  renamingId,
  renameTitle,
  setRenameTitle,
  setRenamingId,
  submitRename,
  workspace
}: {
  activeMenuId: string | null;
  currentWorkspaceId: string;
  onMenuToggle(activeMenuId: string | null): void;
  onRename(workspace: Workspace): void;
  onWorkspaceNavigate(targetWorkspaceId: string, options?: { replace?: boolean }): Promise<void>;
  openDeleteDialog(workspace: Workspace): void;
  locale: ReturnType<typeof useLocale>["locale"];
  messages: AppMessages;
  renamingId: string | null;
  renameTitle: string;
  setRenameTitle(title: string): void;
  setRenamingId(workspaceId: string | null): void;
  submitRename(event: FormEvent<HTMLFormElement>, workspace: Workspace): Promise<void>;
  workspace: Workspace;
}) {
  const isMenuOpen = activeMenuId === workspace.id;
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const copy = messages.workspaceSidebar;

  return (
    <div className="workspace-sidebar-item-shell">
      {renamingId === workspace.id ? (
        <form className="workspace-sidebar-rename-form" onSubmit={event => submitRename(event, workspace)}>
          <input
            value={renameTitle}
            onChange={event => setRenameTitle(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") setRenamingId(null);
            }}
            maxLength={120}
            autoFocus
            required
          />
          <Button type="submit">{copy.save}</Button>
        </form>
      ) : (
        <>
          <PageTransitionLink
            className="workspace-sidebar-item"
            data-active={workspace.id === currentWorkspaceId}
            href={`/workspaces/${workspace.id}`}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (workspace.id === currentWorkspaceId) return;
              event.preventDefault();
              void onWorkspaceNavigate(workspace.id);
            }}
          >
            <strong>{workspace.title}</strong>
            <span>{formatDate(locale, workspace.updatedAt)}</span>
          </PageTransitionLink>
          <button
            ref={menuTriggerRef}
            type="button"
            className="workspace-sidebar-item-menu-trigger"
            onClick={() => onMenuToggle(isMenuOpen ? null : workspace.id)}
            aria-label={interpolate(copy.canvasActions, { title: workspace.title })}
            aria-expanded={isMenuOpen}
          >
            <MoreVerticalIcon />
          </button>
          <PopupMenu
            className="workspace-sidebar-item-menu"
            aria-label={interpolate(copy.canvasActions, { title: workspace.title })}
            ignoreRef={menuTriggerRef}
            isOpen={isMenuOpen}
            onClose={() => onMenuToggle(null)}
          >
            <PopupMenuItem onClick={() => onRename(workspace)}>
              {copy.rename}
            </PopupMenuItem>
            <PopupMenuItem
              tone="danger"
              onClick={() => {
                openDeleteDialog(workspace);
              }}
            >
              {messages.common.delete}
            </PopupMenuItem>
          </PopupMenu>
        </>
      )}
    </div>
  );
}
