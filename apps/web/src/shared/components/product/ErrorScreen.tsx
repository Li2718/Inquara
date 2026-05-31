"use client";

type ErrorScreenProps = {
  heading?: string;
  message?: string;
  onRetry: () => void;
};

export function ErrorScreen({
  heading = "This view lost its thread.",
  message = "Something interrupted the page while it was loading. Try again, or return to the canvas.",
  onRetry
}: ErrorScreenProps) {
  return (
    <main className="error-page">
      <section className="error-content" aria-labelledby="error-title">
        <p className="eyebrow">Inquara</p>
        <p className="error-code">Hold on</p>
        <h1 id="error-title">{heading}</h1>
        <p className="muted">{message}</p>
        <div className="error-actions">
          <button type="button" onClick={onRetry}>
            Try again
          </button>
          <a className="secondary-button error-home-link" href="/">
            Back to canvas
          </a>
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
