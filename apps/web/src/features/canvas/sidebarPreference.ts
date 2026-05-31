export const WORKSPACE_SIDEBAR_OPEN_COOKIE = "inquara_workspace_sidebar_open";
export const WORKSPACE_SIDEBAR_OPEN_STORAGE_KEY = "inquara:workspace-sidebar-open";

export function parseSidebarOpenPreference(value: string | undefined): boolean {
  return value === "true";
}
