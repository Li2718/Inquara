"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLocale } from "../../locale/LocaleProvider";
import { AppTopBar, PageTransitionLink } from "../chrome";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const { messages } = useLocale();
  const copy = messages.adminNav;
  const pathname = usePathname();

  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label={copy.settings}>
          <p className="admin-sidebar-title">{copy.settings}</p>
          <nav className="admin-nav">
            <PageTransitionLink className="admin-nav-link" href="/admin/users" aria-current={pathname.startsWith("/admin/users") ? "page" : undefined}>
              {copy.users}
            </PageTransitionLink>
            <PageTransitionLink className="admin-nav-link" href="/admin/codes" aria-current={pathname.startsWith("/admin/codes") ? "page" : undefined}>
              {copy.codes}
            </PageTransitionLink>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}
