"use client";

import { FormEvent, useState } from "react";
import { apiJson } from "../../shared/api";
import { Button } from "../../shared/components/ui";

type LoginPageProps = {
  onLoggedIn(): void;
};

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("demo@inquara.local");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiJson(mode === "login" ? "/auth/login" : "/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, rememberMe })
      });
      onLoggedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="login-panel" aria-label="Login">
        <div>
          <p className="eyebrow">Inquara</p>
          <h1>Start from one question.</h1>
          <p className="muted">
            Sign in to open your personal canvases and grow branches from any answer.
          </p>
        </div>
        <form className="login-form" onSubmit={submit}>
          <div className="auth-mode-toggle" role="tablist" aria-label="Auth mode">
            <button type="button" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
              Login
            </button>
            <button type="button" aria-pressed={mode === "register"} onClick={() => setMode("register")}>
              Register
            </button>
          </div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "login" ? 1 : 6}
            required
          />
          <label className="checkbox-row">
            <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} />
            <span>Remember this device</span>
          </label>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : mode === "login" ? "Login" : "Create account"}
          </Button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
