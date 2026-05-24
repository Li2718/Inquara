export const DEBUG_MARKER = "INQUARA_DEBUG_PANEL";

export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
