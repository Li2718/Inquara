"use client";

import type { Workspace } from "@inquara/domain";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { LoginPage } from "../auth/LoginPage";
import { apiJson } from "../../shared/api";

export function WorkspaceListPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [title, setTitle] = useState("Research canvas");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadWorkspaces();
  }, []);

  async function loadWorkspaces() {
    setIsLoading(true);
    setError("");
    try {
      const items = await apiJson<Workspace[]>("/workspaces");
      setWorkspaces(items);
      setNeedsLogin(false);
    } catch {
      setNeedsLogin(true);
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
      setWorkspaces(previous => [workspace, ...previous.filter(item => item.id !== workspace.id)]);
      setTitle("Research canvas");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create workspace.");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="workspace-panel">
          <p className="eyebrow">Inquara</p>
          <h1>Loading workspaces...</h1>
        </section>
      </main>
    );
  }

  if (needsLogin) {
    return <LoginPage onLoggedIn={loadWorkspaces} />;
  }

  return (
    <main className="app-shell workspace-shell">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <p className="eyebrow">Inquara</p>
        <h1>Workspaces</h1>
        <form className="create-form" onSubmit={createWorkspace}>
          <label htmlFor="title">New canvas</label>
          <div className="inline-form">
            <input
              id="title"
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
        {error ? <p className="error-text">{error}</p> : null}
      </aside>

      <section className="workspace-panel" aria-label="Workspace list">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Personal account</p>
            <h2>Your canvases</h2>
          </div>
          <button type="button" className="secondary-button" onClick={loadWorkspaces}>
            Refresh
          </button>
        </div>

        <div className="workspace-list">
          {workspaces.length === 0 ? (
            <p className="empty-state">No canvases yet. Create one to start the first chat node.</p>
          ) : (
            workspaces.map(workspace => (
              <Link key={workspace.id} className="workspace-row" href={`/workspaces/${workspace.id}`}>
                <span>
                  <strong>{workspace.title}</strong>
                  <small>Version {workspace.version}</small>
                </span>
                <span className="row-meta">{new Date(workspace.updatedAt).toLocaleString()}</span>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
