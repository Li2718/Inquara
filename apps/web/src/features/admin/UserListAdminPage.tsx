"use client";

import { useEffect, useMemo, useState } from "react";
import { apiJson } from "../../shared/api";
import { AdminShell } from "../../shared/components/admin";
import type { AdminSection } from "../../shared/components/admin/adminUrlState";
import { LoadingState, SkeletonBlock, Toast } from "../../shared/components/ui";
import { formatCount, formatDate, formatDateTime } from "../../shared/format";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { interpolate } from "../../shared/messages";

type AdminUser = {
  id: string;
  avatarUrl: string | null;
  canvasCount: number;
  chatCount: number;
  createdAt: string;
  email: string;
  lastLoginAt: string | null;
  lastQuestionAt: string | null;
  loginDays: number;
  name: string | null;
  questionCount: number;
  registrationInviteNote: string | null;
  registeredDays: number;
  role: string;
};

export function UserListAdminPage({
  activeSection,
  onSectionNavigate
}: {
  activeSection: AdminSection;
  onSectionNavigate(section: AdminSection): void;
}) {
  const { locale, messages } = useLocale();
  const copy = messages.adminUsers;
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiJson<AdminUser[]>("/admin/users")
      .then(items => {
        if (isMounted) setUsers(items);
      })
      .catch(caught => {
        if (isMounted) setError(caught instanceof Error ? caught.message : copy.failedLoad);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [copy.failedLoad]);

  const summary = useMemo(() => {
    const totalQuestions = users.reduce((sum, user) => sum + user.questionCount, 0);
    const totalCanvases = users.reduce((sum, user) => sum + user.canvasCount, 0);
    const activeUsers = users.filter(user => user.lastLoginAt || user.lastQuestionAt).length;
    return { totalQuestions, totalCanvases, activeUsers };
  }, [users]);

  if (isLoading) {
    return (
      <AdminShell activeSection={activeSection} onSectionNavigate={onSectionNavigate}>
        <section className="admin-panel">
          <LoadingState variant="panel" aria-label={copy.loading} />
          <SkeletonBlock variant="panel" rows={5} />
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell activeSection={activeSection} onSectionNavigate={onSectionNavigate}>
      <section className="admin-panel admin-users-panel">
        <Toast message={error || null} onDismiss={() => setError("")} />
        <div className="admin-header admin-users-header">
          <div>
            <p className="eyebrow">{copy.admin}</p>
            <h1>{copy.heading}</h1>
            <p className="muted">{copy.subtitle}</p>
          </div>
          <div className="admin-users-summary" aria-label={copy.summary}>
            <SummaryMetric label={copy.users} value={formatCount(locale, users.length)} />
            <SummaryMetric label={copy.activeUsers} value={formatCount(locale, summary.activeUsers)} />
            <SummaryMetric label={copy.canvases} value={formatCount(locale, summary.totalCanvases)} />
            <SummaryMetric label={copy.questions} value={formatCount(locale, summary.totalQuestions)} />
          </div>
        </div>

        <div className="admin-users-table-shell">
          <table className="admin-users-table">
            <thead>
              <tr>
                <th>{copy.user}</th>
                <th>{copy.registered}</th>
                <th>{copy.registeredDays}</th>
                <th>{copy.loginDays}</th>
                <th>{copy.canvases}</th>
                <th>{copy.chats}</th>
                <th>{copy.questions}</th>
                <th>{copy.lastLogin}</th>
                <th>{copy.lastQuestion}</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td className="admin-user-cell">
                    <UserAvatar user={user} />
                    <span>
                      <strong className="admin-user-name-line">
                        <span className="admin-user-name-text">{user.name || copy.unnamed}</span>
                        {user.registrationInviteNote ? (
                          <span className="admin-user-invite-note">{user.registrationInviteNote}</span>
                        ) : null}
                      </strong>
                      <span>{user.email}</span>
                    </span>
                    {user.role === "admin" ? <span className="admin-user-role">{copy.roleAdmin}</span> : null}
                  </td>
                  <td>{formatDate(locale, user.createdAt)}</td>
                  <td>{interpolate(copy.daysValue, { count: formatCount(locale, user.registeredDays) })}</td>
                  <td>{interpolate(copy.daysValue, { count: formatCount(locale, user.loginDays) })}</td>
                  <td>{formatCount(locale, user.canvasCount)}</td>
                  <td>{formatCount(locale, user.chatCount)}</td>
                  <td>{formatCount(locale, user.questionCount)}</td>
                  <td>{formatOptionalDateTime(locale, user.lastLoginAt, messages.common.unknown)}</td>
                  <td>{formatOptionalDateTime(locale, user.lastQuestionAt, messages.common.unknown)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="admin-users-summary-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function UserAvatar({ user }: { user: AdminUser }) {
  const label = user.name || user.email;
  const initial = label.trim().slice(0, 1).toUpperCase() || "U";
  if (user.avatarUrl) {
    return <img className="admin-user-avatar" src={user.avatarUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />;
  }
  return <span className="admin-user-avatar admin-user-avatar-fallback">{initial}</span>;
}

function formatOptionalDateTime(locale: "en" | "zh-CN", value: string | null, fallback: string): string {
  return value ? formatDateTime(locale, value) : fallback;
}
