"use client";

import type { Workspace } from "@inquara/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiJson } from "../../shared/api";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";

type WorkspaceSidebarProps = {
  currentWorkspaceId: string;
  isOpen: boolean;
  onToggle(): void;
};

export function WorkspaceSidebar({ currentWorkspaceId, isOpen, onToggle }: WorkspaceSidebarProps) {
  const router = useRouter();
  const { state, commands, sendCommand } = useWorkspaceSession();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [title, setTitle] = useState("Research canvas");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadWorkspaces();
  }, [currentWorkspaceId]);

  async function loadWorkspaces() {
    setIsLoading(true);
    setError("");
    try {
      setWorkspaces(await apiJson<Workspace[]>("/workspaces"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load workspaces.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      const workspace = await apiJson<Workspace>("/workspaces", {
        method: "POST",
        body: JSON.stringify({ title })
      });
      setTitle("Research canvas");
      router.push(`/workspaces/${workspace.id}`);
      setWorkspaces(previous => [workspace, ...previous.filter(item => item.id !== workspace.id)]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className="sidebar-toggle sidebar-toggle-collapsed" onClick={onToggle}>
        Workspaces
      </button>
    );
  }

  const deletedNodes = (state.snapshot?.nodes ?? []).filter(node => node.deletedAt);

  return (
    <aside className="workspace-sidebar" aria-label="Workspace navigation">
      <div className="workspace-sidebar-header">
        <div>
          <p className="eyebrow">Inquara</p>
          <h2>Canvases</h2>
        </div>
        <button type="button" className="sidebar-toggle" onClick={onToggle}>
          Hide
        </button>
      </div>

      <form className="workspace-create-form" onSubmit={createWorkspace}>
        <label htmlFor="workspace-title">New canvas</label>
        <div className="workspace-create-row">
          <input
            id="workspace-title"
            value={title}
            onChange={event => setTitle(event.target.value)}
            maxLength={120}
            required
          />
          <button type="submit" disabled={isCreating}>
            {isCreating ? "Creating" : "Create"}
          </button>
        </div>
      </form>

      <div className="workspace-sidebar-list" aria-label="Canvas list">
        {isLoading ? <p className="workspace-sidebar-note">Loading canvases...</p> : null}
        {!isLoading && workspaces.length === 0 ? (
          <p className="workspace-sidebar-note">No canvases yet.</p>
        ) : null}
        {workspaces.map(workspace => (
          <Link
            key={workspace.id}
            className="workspace-sidebar-item"
            data-active={workspace.id === currentWorkspaceId}
            href={`/workspaces/${workspace.id}`}
          >
            <strong>{workspace.title}</strong>
            <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
          </Link>
        ))}
      </div>

      <details className="trash-panel">
        <summary>Trash {deletedNodes.length ? `(${deletedNodes.length})` : ""}</summary>
        <div className="trash-list">
          {deletedNodes.length === 0 ? <p className="workspace-sidebar-note">No deleted chats.</p> : null}
          {deletedNodes.map(node => (
            <button
              key={node.id}
              type="button"
              className="trash-restore-button"
              onClick={() => sendCommand(commands.restoreDeletedNodeSubtree(node.id))}
            >
              Restore {node.title}
            </button>
          ))}
        </div>
      </details>

      {error ? <p className="error-text">{error}</p> : null}
    </aside>
  );
}
