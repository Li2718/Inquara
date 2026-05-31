import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <section className="not-found-content" aria-labelledby="not-found-title">
        <p className="eyebrow">Inquara</p>
        <p className="not-found-code">404</p>
        <h1 id="not-found-title">Page not found</h1>
        <p className="muted">This page is unavailable or you do not have access to it.</p>
        <Link className="not-found-action" href="/">
          Back to canvas
        </Link>
      </section>
      <div className="not-found-map" aria-hidden="true">
        <span className="not-found-line not-found-line-a" />
        <span className="not-found-line not-found-line-b" />
        <span className="not-found-line not-found-line-c" />
        <span className="not-found-node not-found-node-a" />
        <span className="not-found-node not-found-node-b" />
        <span className="not-found-node not-found-node-c" />
        <span className="not-found-node not-found-node-d" />
      </div>
    </main>
  );
}
