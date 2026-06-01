"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiJson } from "../../shared/api";
import { AppTopBar, PageTransitionLink } from "../../shared/components/chrome";
import { Button, CheckIcon, ChevronDownIcon, ConfirmDialog, CopyIcon, EditIcon, IconButton, InlineIconButton, LoadingState, SkeletonBlock, Toast, TrashIcon } from "../../shared/components/ui";

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

type CodeStatus = "active" | "disabled" | "expired" | "exhausted" | "used";

export function RedemptionCodesAdminPage() {
  const [codes, setCodes] = useState<RedemptionCode[]>([]);
  const [invitationOnly, setInvitationOnly] = useState(false);
  const [note, setNote] = useState("");
  const [validDays, setValidDays] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [editingNoteCode, setEditingNoteCode] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");
  const [deletingCode, setDeletingCode] = useState<RedemptionCode | null>(null);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
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

  async function enableCode(code: string) {
    setError("");
    try {
      await apiJson<RedemptionCode>(`/admin/codes/${code}/enable`, { method: "POST" });
      await refreshCodes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to enable code.");
    }
  }

  async function confirmDeleteCode() {
    if (!deletingCode) return;
    setError("");
    setIsDeleting(true);
    try {
      await apiJson<void>(`/admin/codes/${deletingCode.code}`, { method: "DELETE" });
      setCodes(current => current.filter(code => code.code !== deletingCode.code));
      setDeletingCode(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Failed to delete code.");
      setIsDeleting(false);
    }
  }

  async function copyCode(code: string) {
    setError("");
    try {
      await copyText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(current => (current === code ? null : current)), 1600);
    } catch {
      setError("Failed to copy code.");
    }
  }

  function startEditingNote(code: RedemptionCode) {
    setEditingNoteCode(code.code);
    setEditingNote(code.note ?? "");
  }

  function cancelEditingNote() {
    setEditingNoteCode(null);
    setEditingNote("");
  }

  async function saveNote(code: string) {
    setError("");
    try {
      const updated = await apiJson<RedemptionCode>(`/admin/codes/${code}/note`, {
        method: "PATCH",
        body: JSON.stringify({ note: editingNote || null })
      });
      setCodes(current => current.map(item => (item.code === code ? updated : item)));
      setEditingNoteCode(null);
      setEditingNote("");
    } catch {
      setError("Failed to update note.");
    }
  }

  const activeCount = useMemo(() => codes.filter(code => getCodeStatus(code) === "active").length, [codes]);

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

  return (
    <AdminShell>
      <section className="admin-panel">
        <Toast message={error || null} onDismiss={() => setError("")} />
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

        <div className="admin-code-list">
          {codes.map(code => {
            const status = getCodeStatus(code);
            const isUsed = code.redemptionCount > 0;
            const canToggleDisabled = status === "active" || status === "used" || status === "disabled";
            const showStateButton = status !== "expired";
            const canDelete = code.redemptionCount === 0;

            return (
            <article key={code.code} className="admin-code-row" data-status={status} data-used={isUsed}>
              <div>
                <div className="admin-code-primary">
                  <button type="button" className="admin-code-copy-button" onClick={() => copyCode(code.code)} aria-label={`Copy invitation code ${code.code}`} title="Copy code">
                    <strong>{code.code}</strong>
                    <span className="admin-code-copy-icon" aria-hidden="true">
                      <CopyIcon />
                    </span>
                  </button>
                  {copiedCode === code.code ? <span className="admin-code-copied">Copied</span> : null}
                </div>
                {editingNoteCode === code.code ? (
                  <form
                    className="admin-code-note-editor"
                    onSubmit={event => {
                      event.preventDefault();
                      void saveNote(code.code);
                    }}
                    onBlur={event => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        cancelEditingNote();
                      }
                    }}
                    onKeyDown={event => {
                      if (event.key === "Escape") {
                        cancelEditingNote();
                      }
                    }}
                  >
                    <input value={editingNote} onChange={event => setEditingNote(event.target.value)} maxLength={240} aria-label={`Note for ${code.code}`} autoFocus />
                    <IconButton className="admin-code-note-save" type="submit" aria-label={`Save note for ${code.code}`} title="Save note">
                      <CheckIcon />
                    </IconButton>
                  </form>
                ) : (
                  <div className="admin-code-note-line">
                    {code.note ? <span>{code.note}</span> : null}<InlineIconButton className="admin-code-note-edit" aria-label={`Edit note for ${code.code}`} title="Edit note" onClick={() => startEditingNote(code)}>
                      <EditIcon />
                    </InlineIconButton>
                  </div>
                )}
              </div>
              <div className="admin-code-redemption-cell">
                <span>{code.redemptionCount}/{code.maxRedemptions} used</span>
                <span className="admin-code-redemption-summary">
                  <span>{formatFirstRedemptionUser(code)}</span>
                  {code.redemptions.length > 1 ? (
                    <InlineIconButton
                      className="admin-code-users-toggle"
                      aria-expanded={expandedCode === code.code}
                      aria-label={`${expandedCode === code.code ? "Hide" : "Show"} users for invitation code ${code.code}`}
                      title={expandedCode === code.code ? "Hide users" : "Show users"}
                      onClick={() => setExpandedCode(expandedCode === code.code ? null : code.code)}
                    >
                      <ChevronDownIcon />
                    </InlineIconButton>
                  ) : null}
                </span>
                {expandedCode === code.code ? (
                  <ul className="admin-redemption-users">
                    {code.redemptions.map(redemption => (
                      <li key={redemption.id}>{redemption.user.name || redemption.user.email}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div>
                <span>Source: {code.source}</span>
                <span>By: {code.createdBy?.email ?? "Unknown"}</span>
              </div>
              <div>
                <span>{code.expiresAt ? `Expires ${new Date(code.expiresAt).toLocaleString()}` : "No expiry"}</span>
                <span className="admin-code-status" data-status={status}>{formatCodeStatus(status)}</span>
              </div>
              <div className="admin-code-actions">
                {showStateButton ? (
                  status === "disabled" ? (
                    <Button type="button" className="admin-code-state-button" variant="secondary" disabled={!canToggleDisabled} onClick={() => enableCode(code.code)}>
                      Enable
                    </Button>
                  ) : (
                    <Button type="button" className="admin-code-state-button" variant="danger" disabled={!canToggleDisabled} onClick={() => disableCode(code.code)}>
                      Disable
                    </Button>
                  )
                ) : (
                  <span className="admin-code-state-placeholder" aria-hidden="true" />
                )}
                {canDelete ? (
                  <InlineIconButton className="admin-code-delete-button" aria-label={`Delete invitation code ${code.code}`} title="Delete code" onClick={() => setDeletingCode(code)}>
                    <TrashIcon />
                  </InlineIconButton>
                ) : (
                  <span className="admin-code-delete-placeholder" aria-hidden="true" />
                )}
              </div>
            </article>
            );
          })}
        </div>
        <ConfirmDialog
          isOpen={Boolean(deletingCode)}
          title="Delete invitation code?"
          description={deletingCode ? `${deletingCode.code} will be permanently deleted. This is only allowed for unused codes.` : undefined}
          confirmLabel={isDeleting ? "Deleting" : "Delete"}
          confirmTone="danger"
          isConfirming={isDeleting}
          onCancel={() => setDeletingCode(null)}
          onConfirm={confirmDeleteCode}
        />
      </section>
    </AdminShell>
  );
}

async function copyText(text: string) {
  if (copyTextWithSelection(text)) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    throw new Error("Copy command failed.");
  }
}

function copyTextWithSelection(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.append(textarea);
  textarea.select();
  const didCopy = document.execCommand("copy");
  textarea.remove();
  return didCopy;
}

function getCodeStatus(code: RedemptionCode): CodeStatus {
  if (code.redemptionCount >= code.maxRedemptions) return "exhausted";
  if (code.redemptionCount > 0) return "used";
  if (code.expiresAt && new Date(code.expiresAt).getTime() <= Date.now()) return "expired";
  if (code.disabledAt) return "disabled";
  return "active";
}

function formatCodeStatus(status: CodeStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "disabled":
      return "Disabled";
    case "expired":
      return "Expired";
    case "exhausted":
      return "Exhausted";
    case "used":
      return "Used";
  }
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label="Admin settings">
          <p className="admin-sidebar-title">Settings</p>
          <nav className="admin-nav">
            <PageTransitionLink className="admin-nav-link" href="/admin/codes" aria-current="page">
              邀请码
            </PageTransitionLink>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}

function formatFirstRedemptionUser(code: RedemptionCode): string {
  if (code.redemptions.length === 0) return "Unused";
  const firstUser = code.redemptions[0]?.user;
  return firstUser?.name || firstUser?.email || "Unknown user";
}
