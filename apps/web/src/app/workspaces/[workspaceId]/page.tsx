import { CanvasWorkspace } from "../../../features/canvas/CanvasWorkspace";

type WorkspacePageProps = {
  params: Promise<{ workspaceId: string }>;
};

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { workspaceId } = await params;

  return <CanvasWorkspace workspaceId={workspaceId} />;
}
