import Link from "next/link";
import { WorkspaceSessionProvider } from "../../../features/workspace-session/WorkspaceSessionProvider";
import { WorkspaceSessionStatus } from "../../../features/workspace-session/WorkspaceSessionStatus";

type WorkspacePageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  return (
    <main className="app-shell workspace-shell">
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <p className="eyebrow">Inquara</p>
        <h1>Canvas</h1>
        <Link className="secondary-link" href="/">
          Back to workspaces
        </Link>
      </aside>
      <WorkspaceSessionProvider workspaceId={workspaceId}>
        <section className="workspace-panel" aria-label="Canvas placeholder">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>{workspaceId}</h2>
            </div>
          </div>
          <WorkspaceSessionStatus />
          <p className="empty-state">The realtime canvas surface is next.</p>
        </section>
      </WorkspaceSessionProvider>
    </main>
  );
}
