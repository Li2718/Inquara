"use client";

import type { Workspace } from "@inquara/domain";
import Link from "next/link";
import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { apiJson } from "../../shared/api";
import {
  Button,
  ConfirmDialog,
  MoreVerticalIcon,
  PlusIcon,
  PopupMenu,
  PopupMenuItem,
  SidebarCollapseIcon,
  SidebarPanelIcon
} from "../../shared/components/ui";

type WorkspaceSidebarProps = {
  currentWorkspaceId: string;
  isOpen: boolean;
  onToggle(): void;
  onWorkspaceNavigate(targetWorkspaceId: string, options?: { replace?: boolean }): Promise<void>;
};

let workspaceListCache: Workspace[] | null = null;

export function WorkspaceSidebar({ currentWorkspaceId, isOpen, onToggle, onWorkspaceNavigate }: WorkspaceSidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => workspaceListCache ?? []);
  const [isLoading, setIsLoading] = useState(workspaceListCache === null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadWorkspaces({ showLoading: workspaceListCache === null });
  }, []);

  async function loadWorkspaces({ showLoading }: { showLoading: boolean }) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const nextWorkspaces = await apiJson<Workspace[]>("/workspaces");
      workspaceListCache = nextWorkspaces;
      setWorkspaces(nextWorkspaces);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load workspaces.");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  async function createWorkspace() {
    setIsCreating(true);
    setError("");
    try {
      const workspace = await apiJson<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled canvas" })
      });
      setWorkspaces(previous => {
        const nextWorkspaces = [workspace, ...previous.filter(item => item.id !== workspace.id)];
        workspaceListCache = nextWorkspaces;
        return nextWorkspaces;
      });
      await onWorkspaceNavigate(workspace.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create canvas.");
    } finally {
      setIsCreating(false);
    }
  }

  function startRenaming(workspace: Workspace) {
    setActiveMenuId(null);
    setRenamingId(workspace.id);
    setRenameTitle(workspace.title);
    setError("");
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
      setError(caught instanceof Error ? caught.message : "Could not rename canvas.");
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
        const nextWorkspace =
          nextWorkspaces[0] ??
          (await apiJson<Workspace>("/workspaces", {
            method: "POST",
            body: JSON.stringify({ title: "Untitled canvas" })
          }));
        if (nextWorkspaces.length === 0) {
          workspaceListCache = [nextWorkspace];
          setWorkspaces([nextWorkspace]);
        }
        await onWorkspaceNavigate(nextWorkspace.id, { replace: true });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete canvas.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <aside className="workspace-sidebar" data-open={isOpen} aria-label="Workspace navigation">
      <button
        type="button"
        className="workspace-sidebar-morph-button"
        onClick={onToggle}
        aria-label={isOpen ? "Collapse sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
      >
        <SidebarPanelIcon />
      </button>

      <div className="workspace-sidebar-content" aria-hidden={!isOpen}>
        <header className="workspace-sidebar-header">
          <button type="button" className="workspace-sidebar-title-button" onClick={onToggle} aria-label="Collapse sidebar">
            <h2>Canvases</h2>
          </button>
          <button
            type="button"
            className="workspace-sidebar-create-button"
            onClick={createWorkspace}
            aria-label="New canvas"
            disabled={isCreating}
          >
            <PlusIcon />
          </button>
          <button type="button" className="workspace-sidebar-collapse-button" onClick={onToggle} aria-label="Collapse sidebar">
            <SidebarCollapseIcon />
          </button>
        </header>

        <div className="workspace-sidebar-list" aria-label="Canvas list">
          {isLoading ? <p className="workspace-sidebar-note">Loading canvases...</p> : null}
          {!isLoading && workspaces.length === 0 ? (
            <p className="workspace-sidebar-note">No canvases yet.</p>
          ) : null}
          {workspaces.map(workspace => (
            <WorkspaceSidebarItem
              key={workspace.id}
              activeMenuId={activeMenuId}
              currentWorkspaceId={currentWorkspaceId}
              onMenuToggle={setActiveMenuId}
              onRename={startRenaming}
              onWorkspaceNavigate={onWorkspaceNavigate}
              renamingId={renamingId}
              renameTitle={renameTitle}
              setDeletingWorkspace={setDeletingWorkspace}
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
        title="Delete canvas?"
        description={deletingWorkspace ? `${deletingWorkspace.title} will be removed from your canvas list. This uses a soft delete.` : undefined}
        confirmLabel={isDeleting ? "Deleting" : "Delete"}
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
  renamingId,
  renameTitle,
  setDeletingWorkspace,
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
  renamingId: string | null;
  renameTitle: string;
  setDeletingWorkspace(workspace: Workspace): void;
  setRenameTitle(title: string): void;
  setRenamingId(workspaceId: string | null): void;
  submitRename(event: FormEvent<HTMLFormElement>, workspace: Workspace): Promise<void>;
  workspace: Workspace;
}) {
  const isMenuOpen = activeMenuId === workspace.id;
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

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
          <Button type="submit">Save</Button>
        </form>
      ) : (
        <>
          <Link
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
            <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
          </Link>
          <button
            ref={menuTriggerRef}
            type="button"
            className="workspace-sidebar-item-menu-trigger"
            onClick={() => onMenuToggle(isMenuOpen ? null : workspace.id)}
            aria-label={`Canvas actions for ${workspace.title}`}
            aria-expanded={isMenuOpen}
          >
            <MoreVerticalIcon />
          </button>
          <PopupMenu
            className="workspace-sidebar-item-menu"
            aria-label={`Canvas actions for ${workspace.title}`}
            ignoreRef={menuTriggerRef}
            isOpen={isMenuOpen}
            onClose={() => onMenuToggle(null)}
          >
            <PopupMenuItem onClick={() => onRename(workspace)}>
              Rename
            </PopupMenuItem>
            <PopupMenuItem
              tone="danger"
              onClick={() => {
                onMenuToggle(null);
                setDeletingWorkspace(workspace);
              }}
            >
              Delete
            </PopupMenuItem>
          </PopupMenu>
        </>
      )}
    </div>
  );
}
