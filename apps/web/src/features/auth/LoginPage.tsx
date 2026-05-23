"use client";

import { FormEvent, useState } from "react";
import { apiJson } from "../../shared/api";

type LoginPageProps = {
  onLoggedIn(): void;
};

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [email, setEmail] = useState("demo@inquara.local");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await apiJson("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email })
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
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
