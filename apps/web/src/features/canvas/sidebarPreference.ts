export const CANVAS_SIDEBAR_OPEN_COOKIE = "inquara_canvas_sidebar_open";
export const CANVAS_SIDEBAR_OPEN_STORAGE_KEY = "inquara:canvas-sidebar-open";

export function parseSidebarOpenPreference(value: string | undefined): boolean {
  return value === "true";
}
