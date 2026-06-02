"use client";

import { useLocale } from "../../locale/LocaleProvider";

type ErrorScreenProps = {
  heading?: string;
  message?: string;
  onRetry: () => void;
};

export function ErrorScreen({
  heading,
  message,
  onRetry
}: ErrorScreenProps) {
  const { messages } = useLocale();
  const copy = messages.error;

  return (
    <main className="error-page">
      <section className="error-content" aria-labelledby="error-title">
        <p className="eyebrow">Inquara</p>
        <p className="error-code">{copy.holdOn}</p>
        <h1 id="error-title">{heading ?? copy.defaultHeading}</h1>
        <p className="muted">{message ?? copy.defaultMessage}</p>
        <div className="error-actions">
          <button type="button" onClick={onRetry}>
            {copy.tryAgain}
          </button>
        </div>
      </section>
      <div className="error-map" aria-hidden="true">
        <span className="error-line error-line-a" />
        <span className="error-line error-line-b" />
        <span className="error-line error-line-c" />
        <span className="error-node error-node-a" />
        <span className="error-node error-node-b" />
        <span className="error-node error-node-c" />
        <span className="error-node error-node-d" />
      </div>
    </main>
  );
}
