"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { apiJson } from "../../shared/api";
import { AppTopBar } from "../../shared/components/chrome";
import { Button, LoadingState, SkeletonBlock } from "../../shared/components/ui";

type RedemptionCode = {
  code: string;
  createdAt: string;
  createdBy: { email: string; id: string; name: string | null } | null;
  disabledAt: string | null;
  expiresAt: string | null;
  maxRedemptions: number;
  note: string | null;
  redemptionCount: number;
  redemptions: Array<{
    id: string;
    user: { email: string; id: string; name: string | null };
  }>;
  source: string;
};

type CurrentUser = {
  email: string;
  role: string;
};

export function RedemptionCodesAdminPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [invitationOnly, setInvitationOnly] = useState(false);
  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const user = await apiJson<CurrentUser>("/auth/me");
        if (!isMounted) return;
        setCurrentUser(user);
        if (user.role !== "admin") return;
        const [settings, codeList] = await Promise.all([
          apiJson<{ invitationOnly: boolean }>("/admin/settings/registration"),
          apiJson<RedemptionCode[]>("/admin/codes")
        ]);
        if (!isMounted) return;
        setInvitationOnly(settings.invitationOnly);
        setCodes(codeList);
      } catch (caught) {
        if (isMounted) setError(caught instanceof Error ? caught.message : "Failed to load admin codes.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, []);

  async function refreshCodes() {
    setCodes(await apiJson<RedemptionCode[]>("/admin/codes"));
  }

  async function toggleInvitationOnly() {
    const next = !invitationOnly;
    setInvitationOnly(next);
    try {
      await apiJson<{ invitationOnly: boolean }>("/admin/settings/registration", {
        method: "PUT",
        body: JSON.stringify({ invitationOnly: next })
      });
    } catch (caught) {
      setInvitationOnly(!next);
      setError(caught instanceof Error ? caught.message : "Failed to update registration setting.");
    }
  }

  async function createCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiJson<RedemptionCode>("/admin/codes", {
        method: "POST",
        body: JSON.stringify({
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          maxRedemptions: Number(maxRedemptions) || 1,
          note: note || null,
          validDays: validDays ? Number(validDays) : undefined
        })
      });
      setNote("");
      setValidDays("");
      setExpiresAt("");
      setMaxRedemptions("1");
      await refreshCodes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to create code.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function disableCode(code: string) {
    setError("");
    try {
      await apiJson<RedemptionCode>(`/admin/codes/${code}/disable`, { method: "POST" });
      await refreshCodes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to disable code.");
    }
  }

  const activeCount = useMemo(() => codes.filter(code => !code.disabledAt && code.redemptionCount < code.maxRedemptions).length, [codes]);

  if (isLoading) {
    return (
      <AdminShell>
        <section className="admin-panel">
          <LoadingState variant="panel" aria-label="Loading admin" />
          <SkeletonBlock variant="panel" rows={4} />
        </section>
      </AdminShell>
    );
  }

  if (!isAdmin) {
    return (
      <AdminShell>
        <section className="admin-panel">
          <p className="eyebrow">Admin</p>
          <h1>Access denied</h1>
          <p className="muted">This page is only available to administrators.</p>
        </section>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <section className="admin-panel">
        <div className="admin-header">
          <div>
            <p className="eyebrow">Admin</p>
            <h1>Invitation codes</h1>
            <p className="muted">Manage registration eligibility redemption codes.</p>
          </div>
          <div className="admin-summary">
            <strong>{activeCount}</strong>
            <span>active</span>
          </div>
        </div>

        <div className="admin-setting-row" data-enabled={invitationOnly}>
          <div>
            <strong>Require invitation code</strong>
            <p className="muted">Local development and tests default this off unless enabled here.</p>
          </div>
          <div className="admin-setting-control">
            <span>{invitationOnly ? "On" : "Off"}</span>
            <button
              type="button"
              className="admin-switch"
              role="switch"
              aria-checked={invitationOnly}
              aria-label="Require invitation code"
              onClick={toggleInvitationOnly}
            >
              <span />
            </button>
          </div>
        </div>

        <form className="admin-code-form" onSubmit={createCode}>
          <label htmlFor="code-note">Note</label>
          <input id="code-note" value={note} onChange={event => setNote(event.target.value)} placeholder="Optional" />
          <label htmlFor="max-redemptions">Uses</label>
          <input id="max-redemptions" type="number" min={1} value={maxRedemptions} onChange={event => setMaxRedemptions(event.target.value)} />
          <label htmlFor="valid-days">Valid days</label>
          <input id="valid-days" type="number" min={1} value={validDays} onChange={event => setValidDays(event.target.value)} placeholder="No expiry" />
          <label htmlFor="expires-at">Or exact expiry</label>
          <input id="expires-at" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Generating..." : "Generate code"}
          </Button>
        </form>

        {error ? <p className="error-text">{error}</p> : null}

        <div className="admin-code-list">
          {codes.map(code => (
            <article key={code.code} className="admin-code-row" data-disabled={Boolean(code.disabledAt)}>
              <div>
                <strong>{code.code}</strong>
                <span>{code.note || "No note"}</span>
              </div>
              <div>
                <span>{code.redemptionCount}/{code.maxRedemptions} used</span>
                <span>{formatRedemptionUsers(code)}</span>
              </div>
              <div>
                <span>Source: {code.source}</span>
                <span>By: {code.createdBy?.email ?? "Unknown"}</span>
              </div>
              <div>
                <span>{code.expiresAt ? `Expires ${new Date(code.expiresAt).toLocaleString()}` : "No expiry"}</span>
                <span>{code.disabledAt ? "Disabled" : "Enabled"}</span>
              </div>
              <div className="admin-code-actions">
                {code.redemptions.length > 1 ? (
                  <button type="button" className="secondary-button" onClick={() => setExpandedCode(expandedCode === code.code ? null : code.code)}>
                    {expandedCode === code.code ? "Hide users" : "Show users"}
                  </button>
                ) : null}
                <button type="button" className="danger-button" disabled={Boolean(code.disabledAt)} onClick={() => disableCode(code.code)}>
                  Disable
                </button>
              </div>
              {expandedCode === code.code ? (
                <ul className="admin-redemption-users">
                  {code.redemptions.map(redemption => (
                    <li key={redemption.id}>{redemption.user.name || redemption.user.email}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin settings">
          <p className="admin-sidebar-title">Settings</p>
          <nav className="admin-nav">
            <Link className="admin-nav-link" href="/admin/codes" aria-current="page">
              邀请码
            </Link>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}

function formatRedemptionUsers(code: RedemptionCode): string {
  if (code.redemptions.length === 0) return "Unused";
  const firstUser = code.redemptions[0]?.user;
  const firstLabel = firstUser?.name || firstUser?.email || "Unknown user";
  if (code.redemptions.length === 1) return firstLabel;
  return `${firstLabel} and ${code.redemptions.length - 1} others`;
}
