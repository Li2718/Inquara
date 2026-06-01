"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiJson } from "../../shared/api";
import { Button, Toast } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";

type LoginPageProps = {
  onLoggedIn(): void;
};

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const { messages } = useLocale();
  const copy = messages.auth;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redemptionCode, setRedemptionCode] = useState("");
  const [isCodeFieldOpen, setIsCodeFieldOpen] = useState(false);
  const [isInvitationOnly, setIsInvitationOnly] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiJson<{ invitationOnly: boolean }>("/auth/registration-settings")
      .then(settings => {
        if (!isMounted) return;
        setIsInvitationOnly(settings.invitationOnly);
        setIsCodeFieldOpen(settings.invitationOnly);
      })
      .catch(() => {
        if (isMounted) setIsInvitationOnly(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiJson(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe, redemptionCode })
      });
      onLoggedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <Toast message={error || null} onDismiss={() => setError("")} />
      <section className="login-panel" aria-label={copy.loginPanel}>
        <div>
          <p className="eyebrow">Inquara</p>
          <h1>{copy.title}</h1>
          <p className="muted">{copy.subtitle}</p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="auth-mode-toggle" role="tablist" aria-label={copy.authMode}>
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
              {copy.loginAction}
            </button>
            <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>
              {copy.registerAction}
            </button>
          </div>
          <label htmlFor="email">{copy.email}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="password">{copy.password}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "login" ? 1 : 6}
            required
          />
          {mode === "register" ? (
            <div className="redemption-code-field" data-open={isCodeFieldOpen || isInvitationOnly}>
              {isInvitationOnly ? (
                <label htmlFor="redemption-code">{copy.invitationCode}</label>
              ) : (
                <button
                  type="button"
                  className="redemption-code-toggle"
                  aria-expanded={isCodeFieldOpen}
                  onClick={() => setIsCodeFieldOpen(value => !value)}
                >
                  {copy.invitationMore}
                  <span aria-hidden="true" />
                </button>
              )}
              {isCodeFieldOpen || isInvitationOnly ? (
                <>
                  {!isInvitationOnly ? <label htmlFor="redemption-code">{copy.invitationCode}</label> : null}
                  <input
                    id="redemption-code"
                    value={redemptionCode}
                    onChange={event => setRedemptionCode(event.target.value)}
                    autoComplete="one-time-code"
                    required={isInvitationOnly}
                  />
                </>
              ) : null}
            </div>
          ) : null}
          <label className="checkbox-row">
            <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />
            <span>{copy.rememberDevice}</span>
          </label>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? copy.submitWorking : mode === "login" ? copy.loginAction : copy.createAccount}
          </Button>
        </form>
      </section>
    </main>
  );
}
