import type { Workspace } from "@inquara/domain";

export function upsertWorkspaceList(workspaces: Workspace[], workspace: Workspace): Workspace[] {
  return [workspace, ...workspaces.filter(item => item.id !== workspace.id)];
}
