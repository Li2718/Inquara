import type { AdminSection } from "./adminUrlState";

export type AdminNavLinkState = {
  ariaCurrent: "page" | undefined;
  isPending: boolean;
  isVisuallyActive: boolean;
};

export function getAdminNavLinkState({
  activeSection,
  href,
  pendingHref = null
}: {
  activeSection?: AdminSection;
  href: string;
  pathname?: string;
  pendingHref?: string | null;
}): AdminNavLinkState {
  const isCurrent = activeSection ? adminSectionMatchesHref(activeSection, href) : false;
  const isPending = pendingHref === href && !isCurrent;
  const hasPendingNavigation = pendingHref !== null && !isCurrent;

  return {
    ariaCurrent: isCurrent ? "page" : undefined,
    isPending,
    isVisuallyActive: hasPendingNavigation ? isPending : isCurrent
  };
}

export function adminSectionMatchesHref(section: AdminSection, href: string): boolean {
  return href === (section === "codes" ? "/admin/codes" : "/admin/users");
}

export function shouldStartAdminNavPendingNavigation(event: {
  altKey?: boolean;
  button: number;
  ctrlKey?: boolean;
  defaultPrevented: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}): boolean {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}
