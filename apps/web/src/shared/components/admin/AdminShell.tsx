"use client";

import type { ReactNode } from "react";
import { useLocale } from "../../locale/LocaleProvider";
import { AppTopBar } from "../chrome";
import { getAdminNavLinkState } from "./adminNavigation";
import type { AdminSection } from "./adminUrlState";

type AdminShellProps = {
  activeSection: AdminSection;
  children: ReactNode;
  onSectionNavigate(section: AdminSection): void;
};

export function AdminShell({ activeSection, children, onSectionNavigate }: AdminShellProps) {
  const { messages } = useLocale();
  const copy = messages.adminNav;

  const usersLinkState = getAdminNavLinkState({ href: "/admin/users", activeSection });
  const codesLinkState = getAdminNavLinkState({ href: "/admin/codes", activeSection });

  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label={copy.settings}>
          <p className="admin-sidebar-title">{copy.settings}</p>
          <nav className="admin-nav">
            <button
              type="button"
              className="admin-nav-link"
              aria-current={usersLinkState.ariaCurrent}
              data-active={usersLinkState.isVisuallyActive}
              data-pending={usersLinkState.isPending}
              onClick={() => onSectionNavigate("users")}
            >
              {copy.users}
            </button>
            <button
              type="button"
              className="admin-nav-link"
              aria-current={codesLinkState.ariaCurrent}
              data-active={codesLinkState.isVisuallyActive}
              data-pending={codesLinkState.isPending}
              onClick={() => onSectionNavigate("codes")}
            >
              {copy.codes}
            </button>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}
