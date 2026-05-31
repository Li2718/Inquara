"use client";

import type { Workspace } from "@inquara/domain";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginPage } from "../auth/LoginPage";
import { apiJson } from "../../shared/api";
import { LoadingState } from "../../shared/components/ui";

export function WorkspaceListPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void openCanvas();
  }, []);

  async function openCanvas() {
    setIsLoading(true);
    setError("");
    try {
      const items = await apiJson<Workspace[]>("/workspaces");
      const workspace =
        items[0] ??
        (await apiJson<Workspace>("/workspaces", {
          method: "POST",
          body: JSON.stringify({ title: "Research canvas" })
        }));
      setNeedsLogin(false);
      router.replace(`/workspaces/${workspace.id}`);
    } catch {
      setNeedsLogin(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="workspace-panel workspace-loading-panel">
          <LoadingState variant="page" aria-label="Opening canvas" />
        </section>
      </main>
    );
  }

  if (needsLogin) {
    return <LoginPage onLoggedIn={openCanvas} />;
  }

  return (
    <main className="app-shell">
      <section className="workspace-panel workspace-loading-panel">
        <LoadingState variant="page" aria-label="Opening canvas" />
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
