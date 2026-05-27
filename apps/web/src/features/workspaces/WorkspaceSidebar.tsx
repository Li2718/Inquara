"use client";

import type { Workspace } from "@inquara/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, MouseEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { apiJson } from "../../shared/api";

type WorkspaceSidebarProps = {
  currentWorkspaceId: string;
  isOpen: boolean;
  onToggle(): void;
  onWorkspaceSwitchStart(targetWorkspaceId: string): Promise<void>;
};

let workspaceListCache: Workspace[] | null = null;

export function WorkspaceSidebar({ currentWorkspaceId, isOpen, onToggle, onWorkspaceSwitchStart }: WorkspaceSidebarProps) {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => workspaceListCache ?? []);
  const [isLoading, setIsLoading] = useState(workspaceListCache === null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deletingWorkspace, setDeletingWorkspace] = useState<Workspace | null>(null);
  const [modalRoot, setModalRoot] = useState<HTMLElement | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadWorkspaces({ showLoading: workspaceListCache === null });
  }, []);

  useEffect(() => {
    setModalRoot(document.body);
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
      router.push(`/workspaces/${workspace.id}`);
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
        router.replace(`/workspaces/${nextWorkspace.id}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete canvas.");
    } finally {
      setIsDeleting(false);
    }
  }

  const deleteDialog =
    deletingWorkspace && modalRoot
      ? createPortal(
          <div className="workspace-delete-backdrop" role="presentation">
            <div className="workspace-delete-dialog" role="dialog" aria-modal="true" aria-label="Delete canvas?">
              <h2>Delete canvas?</h2>
              <p>
                {deletingWorkspace.title} will be removed from your canvas list. This uses a soft delete.
              </p>
              <div className="workspace-delete-actions">
                <button type="button" className="secondary-button" onClick={() => setDeletingWorkspace(null)} disabled={isDeleting}>
                  Cancel
                </button>
                <button type="button" className="danger-button" onClick={confirmDeleteWorkspace} disabled={isDeleting}>
                  {isDeleting ? "Deleting" : "Delete"}
                </button>
              </div>
            </div>
          </div>,
          modalRoot
        )
      : null;

  return (
    <aside className="workspace-sidebar" data-open={isOpen} aria-label="Workspace navigation">
      <button
        type="button"
        className="workspace-sidebar-morph-button"
        onClick={onToggle}
        aria-label={isOpen ? "Collapse sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
      >
        <span className="workspace-sidebar-open-icon" aria-hidden="true">
          <span />
          <span />
        </span>
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
            +
          </button>
          <button type="button" className="workspace-sidebar-collapse-button" onClick={onToggle} aria-label="Collapse sidebar">
            <span aria-hidden="true" />
          </button>
        </header>

        <div className="workspace-sidebar-list" aria-label="Canvas list">
          {isLoading ? <p className="workspace-sidebar-note">Loading canvases...</p> : null}
          {!isLoading && workspaces.length === 0 ? (
            <p className="workspace-sidebar-note">No canvases yet.</p>
          ) : null}
          {workspaces.map(workspace => (
            <div key={workspace.id} className="workspace-sidebar-item-shell">
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
                  <button type="submit">Save</button>
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
                      void onWorkspaceSwitchStart(workspace.id).then(() => {
                        router.push(`/workspaces/${workspace.id}`);
                      });
                    }}
                  >
                    <strong>{workspace.title}</strong>
                    <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
                  </Link>
                  <button
                    type="button"
                    className="workspace-sidebar-item-menu-trigger"
                    onClick={() => setActiveMenuId(activeMenuId === workspace.id ? null : workspace.id)}
                    aria-label={`Canvas actions for ${workspace.title}`}
                    aria-expanded={activeMenuId === workspace.id}
                  >
                    ⋮
                  </button>
                  {activeMenuId === workspace.id ? (
                    <div className="workspace-sidebar-item-menu" role="menu" aria-label={`Canvas actions for ${workspace.title}`}>
                      <button type="button" role="menuitem" onClick={() => startRenaming(workspace)}>
                        Rename
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="danger-menu-item"
                        onClick={() => {
                          setActiveMenuId(null);
                          setDeletingWorkspace(workspace);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
      {deleteDialog}
    </aside>
  );
}
