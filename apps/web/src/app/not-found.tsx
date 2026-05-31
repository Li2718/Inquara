import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-panel">
        <p className="eyebrow">Inquara</p>
        <h1>Page not found</h1>
        <p className="muted">This page is unavailable or you do not have access to it.</p>
        <Link className="not-found-action" href="/">
          Back to canvas
        </Link>
      </section>
    </main>
  );
}
