export type AdminNavLinkState = {
  ariaCurrent: "page" | undefined;
  isPending: boolean;
  isVisuallyActive: boolean;
};

export function getAdminNavLinkState({
  href,
  pathname,
  pendingHref
}: {
  href: string;
  pathname: string;
  pendingHref: string | null;
}): AdminNavLinkState {
  const isCurrent = isAdminNavHrefActive(pathname, href);
  const isPending = pendingHref === href && !isCurrent;
  const hasPendingNavigation = pendingHref !== null && !isAdminNavHrefActive(pathname, pendingHref);

  return {
    ariaCurrent: isCurrent ? "page" : undefined,
    isPending,
    isVisuallyActive: hasPendingNavigation ? isPending : isCurrent
  };
}

export function isAdminNavHrefActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
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
