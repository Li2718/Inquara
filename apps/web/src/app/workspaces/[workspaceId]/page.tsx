import Link from "next/link";
import { CanvasView } from "../../../features/canvas/CanvasView";
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
      <section className="canvas-page" aria-label="Canvas workspace">
        <WorkspaceSessionProvider workspaceId={workspaceId}>
          <div className="canvas-topbar">
            <div>
              <p className="eyebrow">Workspace</p>
              <h2>{workspaceId}</h2>
            </div>
            <WorkspaceSessionStatus />
          </div>
          <CanvasView />
        </WorkspaceSessionProvider>
      </section>
    </main>
  );
}
