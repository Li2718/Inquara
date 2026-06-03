"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { useLocale } from "../../locale/LocaleProvider";
import { AppTopBar } from "../chrome";
import { getAdminNavLinkState, shouldStartAdminNavPendingNavigation } from "./adminNavigation";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { messages } = useLocale();
  const copy = messages.adminNav;
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function startPendingNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!shouldStartAdminNavPendingNavigation(event)) return;
    setPendingHref(href);
  }

  const usersLinkState = getAdminNavLinkState({ href: "/admin/users", pathname, pendingHref });
  const codesLinkState = getAdminNavLinkState({ href: "/admin/codes", pathname, pendingHref });

  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label={copy.settings}>
          <p className="admin-sidebar-title">{copy.settings}</p>
          <nav className="admin-nav">
            <Link
              className="admin-nav-link"
              href="/admin/users"
              aria-current={usersLinkState.ariaCurrent}
              data-active={usersLinkState.isVisuallyActive}
              data-pending={usersLinkState.isPending}
              onClick={event => startPendingNavigation(event, "/admin/users")}
            >
              {copy.users}
            </Link>
            <Link
              className="admin-nav-link"
              href="/admin/codes"
              aria-current={codesLinkState.ariaCurrent}
              data-active={codesLinkState.isVisuallyActive}
              data-pending={codesLinkState.isPending}
              onClick={event => startPendingNavigation(event, "/admin/codes")}
            >
              {copy.codes}
            </Link>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}
