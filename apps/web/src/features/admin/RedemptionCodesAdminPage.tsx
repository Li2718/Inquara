"use client";

import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiJson } from "../../shared/api";
import { AppTopBar, PageTransitionLink } from "../../shared/components/chrome";
import { Button, CheckIcon, ChevronDownIcon, ConfirmDialog, CopyIcon, EditIcon, IconButton, InlineIconButton, LoadingState, SkeletonBlock, Toast, TrashIcon } from "../../shared/components/ui";
import { formatDateTime } from "../../shared/format";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { interpolate, type AppMessages } from "../../shared/messages";

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
  const { locale, messages } = useLocale();
  const copy = messages.adminCodes;
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
        if (isMounted) setError(caught instanceof Error ? caught.message : copy.failedLoad);
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
      setError(caught instanceof Error ? caught.message : copy.failedSetting);
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
      setError(caught instanceof Error ? caught.message : copy.failedCreate);
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
      setError(caught instanceof Error ? caught.message : copy.failedDisable);
    }
  }

  async function enableCode(code: string) {
    setError("");
    try {
      await apiJson<RedemptionCode>(`/admin/codes/${code}/enable`, { method: "POST" });
      await refreshCodes();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.failedEnable);
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
      setError(caught instanceof Error ? caught.message : copy.failedDelete);
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
      setError(copy.failedCopy);
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
      setError(copy.failedNote);
    }
  }

  const activeCount = useMemo(() => codes.filter(code => getCodeStatus(code) === "active").length, [codes]);

  if (isLoading) {
    return (
      <AdminShell>
        <section className="admin-panel">
          <LoadingState variant="panel" aria-label={copy.loading} />
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
            <p className="eyebrow">{copy.admin}</p>
            <h1>{copy.heading}</h1>
            <p className="muted">{copy.subtitle}</p>
          </div>
          <div className="admin-summary">
            <strong>{activeCount}</strong>
            <span>{copy.active}</span>
          </div>
        </div>

        <div className="admin-setting-row" data-enabled={invitationOnly}>
          <div>
            <strong>{copy.requireInvitation}</strong>
            <p className="muted">{copy.invitationOnlyDescription}</p>
          </div>
          <div className="admin-setting-control">
            <span>{invitationOnly ? copy.on : copy.off}</span>
            <button
              type="button"
              className="admin-switch"
              role="switch"
              aria-checked={invitationOnly}
              aria-label={copy.requireInvitation}
              onClick={toggleInvitationOnly}
            >
              <span />
            </button>
          </div>
        </div>

        <form className="admin-code-form" onSubmit={createCode}>
          <label htmlFor="code-note">{copy.note}</label>
          <input id="code-note" value={note} onChange={event => setNote(event.target.value)} placeholder={messages.common.optional} />
          <label htmlFor="max-redemptions">{copy.maxRedemptions}</label>
          <input id="max-redemptions" type="number" min={1} value={maxRedemptions} onChange={event => setMaxRedemptions(event.target.value)} />
          <label htmlFor="valid-days">{copy.validDays}</label>
          <input id="valid-days" type="number" min={1} value={validDays} onChange={event => setValidDays(event.target.value)} placeholder={copy.noExpiry} />
          <label htmlFor="expires-at">{copy.exactExpiry}</label>
          <input id="expires-at" type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? copy.generating : copy.generate}
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
                  <button type="button" className="admin-code-copy-button" onClick={() => copyCode(code.code)} aria-label={interpolate(copy.copyInvitationCode, { code: code.code })} title={copy.copyCode}>
                    <strong>{code.code}</strong>
                    <span className="admin-code-copy-icon" aria-hidden="true">
                      <CopyIcon />
                    </span>
                  </button>
                  {copiedCode === code.code ? <span className="admin-code-copied">{messages.common.copied}</span> : null}
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
                    <input value={editingNote} onChange={event => setEditingNote(event.target.value)} maxLength={240} aria-label={interpolate(copy.noteFor, { code: code.code })} autoFocus />
                    <IconButton className="admin-code-note-save" type="submit" aria-label={interpolate(copy.saveNoteFor, { code: code.code })} title={copy.saveNote}>
                      <CheckIcon />
                    </IconButton>
                  </form>
                ) : (
                  <div className="admin-code-note-line">
                    {code.note ? <span>{code.note}</span> : null}<InlineIconButton className="admin-code-note-edit" aria-label={interpolate(copy.editNoteFor, { code: code.code })} title={messages.common.edit} onClick={() => startEditingNote(code)}>
                      <EditIcon />
                    </InlineIconButton>
                  </div>
                )}
              </div>
              <div className="admin-code-redemption-cell">
                <span>{interpolate(copy.used, { count: code.redemptionCount, max: code.maxRedemptions })}</span>
                <span className="admin-code-redemption-summary">
                  <span>{formatFirstRedemptionUser(code, copy)}</span>
                  {code.redemptions.length > 1 ? (
                    <InlineIconButton
                      className="admin-code-users-toggle"
                      aria-expanded={expandedCode === code.code}
                      aria-label={interpolate(expandedCode === code.code ? copy.hideUsersFor : copy.showUsersFor, { code: code.code })}
                      title={expandedCode === code.code ? copy.hideUsers : copy.showUsers}
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
                <span>{interpolate(copy.source, { source: code.source })}</span>
                <span>{interpolate(copy.by, { email: code.createdBy?.email ?? messages.common.unknown })}</span>
              </div>
              <div>
                <span>{code.expiresAt ? interpolate(copy.expires, { date: formatDateTime(locale, code.expiresAt) }) : copy.noExpiry}</span>
                <span className="admin-code-status" data-status={status}>{formatCodeStatus(status, copy)}</span>
              </div>
              <div className="admin-code-actions">
                {showStateButton ? (
                  status === "disabled" ? (
                    <Button type="button" className="admin-code-state-button" variant="secondary" disabled={!canToggleDisabled} onClick={() => enableCode(code.code)}>
                      {copy.enable}
                    </Button>
                  ) : (
                    <Button type="button" className="admin-code-state-button" variant="danger" disabled={!canToggleDisabled} onClick={() => disableCode(code.code)}>
                      {copy.disable}
                    </Button>
                  )
                ) : (
                  <span className="admin-code-state-placeholder" aria-hidden="true" />
                )}
                {canDelete ? (
                  <InlineIconButton className="admin-code-delete-button" aria-label={interpolate(copy.deleteCodeAria, { code: code.code })} title={copy.deleteCode} onClick={() => setDeletingCode(code)}>
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
          title={copy.deleteConfirm}
          description={deletingCode ? interpolate(copy.deleteDescription, { code: deletingCode.code }) : undefined}
          confirmLabel={isDeleting ? messages.common.deleting : messages.common.delete}
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

function formatCodeStatus(status: CodeStatus, copy: AppMessages["adminCodes"]): string {
  switch (status) {
    case "active":
      return copy.statusActive;
    case "disabled":
      return copy.statusDisabled;
    case "expired":
      return copy.statusExpired;
    case "exhausted":
      return copy.statusExhausted;
    case "used":
      return copy.statusUsed;
  }
}

function AdminShell({ children }: { children: ReactNode }) {
  const { messages } = useLocale();
  const copy = messages.adminCodes;

  return (
    <main className="admin-page">
      <AppTopBar />
      <div className="admin-shell">
        <aside className="admin-sidebar" aria-label={copy.settings}>
          <p className="admin-sidebar-title">{copy.settings}</p>
          <nav className="admin-nav">
            <PageTransitionLink className="admin-nav-link" href="/admin/codes" aria-current="page">
              {copy.navCodes}
            </PageTransitionLink>
          </nav>
        </aside>
        <div className="admin-content">{children}</div>
      </div>
    </main>
  );
}

function formatFirstRedemptionUser(code: RedemptionCode, copy: AppMessages["adminCodes"]): string {
  if (code.redemptions.length === 0) return copy.unused;
  const firstUser = code.redemptions[0]?.user;
  return firstUser?.name || firstUser?.email || copy.unknownUser;
}
