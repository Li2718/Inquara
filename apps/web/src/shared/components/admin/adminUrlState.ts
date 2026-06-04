export type AdminSection = "codes" | "users";

export function parseAdminPathSection(pathname: string): AdminSection | null {
  if (pathname === "/admin") return "users";
  if (pathname === "/admin/users" || pathname.startsWith("/admin/users/")) return "users";
  if (pathname === "/admin/codes" || pathname.startsWith("/admin/codes/")) return "codes";
  return null;
}

export function adminPathForSection(section: AdminSection): string {
  return section === "codes" ? "/admin/codes" : "/admin/users";
}

export function writeAdminPathSection(
  section: AdminSection,
  options: {
    replace?: boolean;
    windowRef?: Window;
  } = {}
): void {
  const windowRef = options.windowRef ?? (typeof window === "undefined" ? null : window);
  if (!windowRef) return;

  const nextPath = adminPathForSection(section);
  if (windowRef.location.pathname === nextPath) return;

  if (options.replace) {
    windowRef.history.replaceState(null, "", nextPath);
    return;
  }

  windowRef.history.pushState(null, "", nextPath);
}
