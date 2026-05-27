"use client";

import { useParams } from "next/navigation";
import { CanvasWorkspace } from "../../features/canvas/CanvasWorkspace";

export function WorkspacesLayoutClient() {
  const params = useParams<{ workspaceId?: string }>();
  const workspaceId = params.workspaceId;

  if (!workspaceId) return null;

  return <CanvasWorkspace workspaceId={workspaceId} />;
}
