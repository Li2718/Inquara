import { PageTransitionLink } from "../shared/components/chrome";
import { getRequestLocale } from "../shared/locale/request";
import { getMessages } from "../shared/messages";

export default async function NotFound() {
  const messages = getMessages(await getRequestLocale());
  const copy = messages.notFound;

  return (
    <main className="not-found-page">
      <section className="not-found-content" aria-labelledby="not-found-title">
        <p className="eyebrow">Inquara</p>
        <p className="not-found-code">404</p>
        <h1 id="not-found-title">{copy.title}</h1>
        <p className="muted">{copy.message}</p>
        <PageTransitionLink className="not-found-action" href="/">
          {copy.action}
        </PageTransitionLink>
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
