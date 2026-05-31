# Deployment

> status: active
> purpose: Define the current Docker Compose production deployment baseline for Inquara.

## Scope

Inquara's first self-managed production baseline is a single-machine Docker Compose deployment.

The root [docker-compose.yml](../docker-compose.yml) is the production Compose entrypoint for managed reverse-proxy environments such as Dokploy. It starts the full production baseline:

- `postgres`
- `migrate`
- `api`
- `web`
- `proxy`

Local development uses `docker-compose.dev.yml` and `npm run dev`; it is separate from this production deployment path.

## Services

| Service | Type | Responsibility |
| --- | --- | --- |
| `postgres` | long-running infrastructure | Stores all application state. |
| `migrate` | one-shot | Runs Prisma migrations with `npm run db:migrate:deploy`, then exits. |
| `api` | long-running application | Runs the Fastify HTTP/WebSocket API on container port `4000`. |
| `web` | long-running application | Runs setup mode or normal Next.js web mode on container port `3000`. |
| `proxy` | long-running edge | Exposes the single public HTTP entrypoint and routes `/api/*` to `api`. |

The long-running application services start only after the database is healthy and migrations have completed. `api`, `web`, and `proxy` are only exposed inside the Compose network in the root Compose file. Public traffic enters through the deployment platform's reverse proxy, such as Dokploy Domains.

## Runtime Model

The API container starts `@inquara/api` with:

```bash
npm run start --workspace @inquara/api
```

The web container starts:

```bash
node scripts/web-start.mjs
```

That script chooses the web startup mode at process startup:

- if setup is incomplete, it starts the setup app
- if setup is complete, it starts the normal Next.js app

After setup succeeds, the setup app exits. Docker restarts the `web` service because the Compose service uses `restart: unless-stopped`. On the next startup, setup is complete and the normal Next.js app starts.

## Environment

Copy `.env.example` to `.env` and set production values before starting the Compose stack.

Required production values:

```dotenv
SESSION_SECRET=replace-with-at-least-32-random-characters
POSTGRES_PASSWORD=replace-with-a-strong-password
```

Important public URL:

```dotenv
WEB_ORIGIN=http://localhost:3000
```

Browser API calls use same-origin `/api/*` by default. The production proxy strips the `/api` prefix and forwards those requests to the internal API service. Browser WebSocket traffic uses the same origin as well:

```text
/api/realtime -> api:4000/realtime
```

`API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, and `NEXT_PUBLIC_WS_ORIGIN` are not part of the default Docker Compose and Dokploy deployment path. Split-origin deployments should use a separate Compose override instead of adding those values to the default production environment.

The Compose file creates the internal container database URL automatically:

```text
postgresql://inquara:<POSTGRES_PASSWORD>@postgres:5432/<POSTGRES_DB>?schema=public
```

`POSTGRES_DB` defaults to `inquara`.

## Commands

Start production:

```bash
npm run prod:up
```

Equivalent command for standalone local or single-machine use without Dokploy:

```bash
docker compose -f docker-compose.yml -f docker-compose.standalone.yml up --build -d
```

The standalone override publishes the `proxy` service to `${WEB_PORT:-3000}` on the host. Dokploy deployments should use only the root `docker-compose.yml` and configure the public domain in Dokploy instead of publishing host ports from Compose.

View logs:

```bash
npm run prod:logs
```

Stop production:

```bash
npm run prod:down
```

## First Setup

On a fresh database, open:

```text
https://your-inquara-domain.example/setup
```

Create the initial account there. The setup flow creates the initial password user with administrator role, then exits setup mode. Docker restarts the web container into the normal product app.

The initial account is not created from environment variables and no default credentials are shipped.

## Health Checks

API health:

```text
http://localhost:3000/api/healthz
```

Web service health, checked from inside the `web` container:

```text
http://127.0.0.1:3000/api/health
```

The web health path exists in both setup mode and normal Next.js mode so Docker can keep one health check across the setup transition. It is not part of the public `/api/*` proxy route.

## Current Boundaries

- The root Compose file exposes no host ports by default.
- The optional standalone override publishes one HTTP port through `proxy`.
- The API remains a separate internal service so WebSocket and AI streaming stay isolated from the Next.js runtime.
- TLS automation is expected to be provided by the deployment platform, such as Dokploy Domains.
- Postgres is internal to the Compose network by default and is not published to the host.
- Backup, restore, external secret manager, observability, and multi-host deployment are not included yet.

## Dokploy

Use Dokploy's Docker Compose deployment flow against the repository root and the root `docker-compose.yml`.

Configure one domain for the `proxy` service on container port `80`. Dokploy can then terminate TLS and route the public domain to Inquara's single HTTP entrypoint.

Set these environment variables in Dokploy:

```dotenv
SESSION_SECRET=replace-with-at-least-32-random-characters
POSTGRES_PASSWORD=replace-with-a-strong-password
WEB_ORIGIN=https://your-inquara-domain.example
AI_PROVIDER=fake
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_MODEL=
```

When using a real OpenAI-compatible provider, set:

```dotenv
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_API_KEY=your-provider-key
OPENAI_COMPATIBLE_MODEL=your-model
```
