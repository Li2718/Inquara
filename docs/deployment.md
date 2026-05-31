# Deployment

> status: active
> purpose: Define the current Docker Compose production deployment baseline for Inquara.

## Scope

Inquara's first self-managed production baseline is a single-machine Docker Compose deployment.

The root [docker-compose.yml](../docker-compose.yml) is the production Compose entrypoint. It starts the full production baseline:

- `postgres`
- `migrate`
- `api`
- `web`
- `proxy`

Local development uses `.env.dev`, `docker-compose.dev.yml`, and `npm run dev`; it is separate from this production deployment path.

## Services

| Service | Type | Responsibility |
| --- | --- | --- |
| `postgres` | long-running infrastructure | Stores all application state. |
| `migrate` | one-shot | Runs Prisma migrations with `npm run db:migrate:deploy`, then exits. |
| `api` | long-running application | Runs the Fastify HTTP/WebSocket API on container port `4000`. |
| `web` | long-running application | Runs setup mode or normal Next.js web mode on container port `3000`. |
| `proxy` | long-running edge | Exposes the single public HTTP entrypoint and routes `/api/*` to `api`. |

The long-running application services start only after the database is healthy and migrations have completed. `api` and `web` are only exposed inside the Compose network. Public traffic enters through `proxy`.

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

Production deployment uses `.env.example` as its template. It has two kinds of values:

- Deployment environment values: set these in Dokploy or `.env` because they are secrets, public origins, or provider choices.
- Compose-owned values: keep these in [docker-compose.yml](../docker-compose.yml) because they are internal service wiring and should not vary per deployment.

Required deployment environment values:

```dotenv
SESSION_SECRET=replace-with-at-least-32-random-characters
POSTGRES_PASSWORD=replace-with-a-strong-password
WEB_ORIGIN=https://your-inquara-domain.example
```

Browser API calls use same-origin `/api/*` by default. The production proxy strips the `/api` prefix and forwards those requests to the internal API service. Browser WebSocket traffic uses the same origin as well:

```text
/api/realtime -> api:4000/realtime
```

`API_ORIGIN`, `NEXT_PUBLIC_API_ORIGIN`, and `NEXT_PUBLIC_WS_ORIGIN` are not part of the default Docker Compose and Dokploy deployment path. Split-origin deployments should use a separate Compose override instead of adding those values to the default production environment.

Optional deployment environment values:

```dotenv
WEB_PORT=3000
AI_PROVIDER=fake
OPENAI_COMPATIBLE_BASE_URL=
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_MODEL=
```

Leave `WEB_PORT` unset when a deployment platform such as Dokploy routes by domain. Docker then assigns a random host port, avoiding fixed-port conflicts.

Set the OpenAI-compatible values only when `AI_PROVIDER=openai-compatible`.

The Compose file owns internal wiring values:

| Value | Compose-owned value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://inquara:<POSTGRES_PASSWORD>@postgres:5432/inquara?schema=public` |
| `POSTGRES_DB` | `inquara` |
| `POSTGRES_USER` | `inquara` |
| API container port | `4000` |
| Web container port | `3000` |
| Web-to-API internal origin | `http://api:4000` |

The Compose file creates the internal container database URL automatically:

```text
postgresql://inquara:<POSTGRES_PASSWORD>@postgres:5432/inquara?schema=public
```

Do not add `DATABASE_URL` to the default production `.env`. The production Compose file owns that internal connection string so deployers only need to provide the database password.

## Local Development Environment

Local development uses [.env.dev.example](../.env.dev.example), not the production [.env.example](../.env.example).

Create a local `.env.dev` from the development example and adjust only the values that need to differ on your machine:

```dotenv
POSTGRES_USER=inquara
POSTGRES_PASSWORD=inquara
POSTGRES_DB=inquara
POSTGRES_HOST=localhost
POSTGRES_PORT=55432
POSTGRES_SCHEMA=public
SESSION_SECRET=replace-with-at-least-32-random-characters
WEB_ORIGIN=http://localhost:3000
API_ORIGIN=http://localhost:4000
AI_PROVIDER=fake
```

The local development scripts load development env files in this order:

```text
.env.dev.local
.env.dev
```

The first loaded value wins. Production `.env` is intentionally not loaded by local development commands.

The development scripts compose `DATABASE_URL` from the split `POSTGRES_*` values before running Prisma, the API, or workspace dev commands:

```text
postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@<POSTGRES_HOST>:<POSTGRES_PORT>/<POSTGRES_DB>?schema=<POSTGRES_SCHEMA>
```

This keeps local database settings editable without requiring application code or Prisma schema changes.

## Commands

Start production:

```bash
npm run prod:up
```

Equivalent command:

```bash
docker compose up --build -d
```

`proxy` publishes container port `80` through `${WEB_PORT}:80`.

- If `WEB_PORT` is set, Docker binds that host port.
- If `WEB_PORT` is not set, Docker assigns a random available host port.

This keeps a single Compose file usable in both Dokploy and standalone Docker deployments without forcing a fixed host port that may conflict with other services.

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

- The `proxy` service publishes one HTTP port. Set `WEB_PORT` to choose it, or leave it unset to let Docker assign an available host port.
- The API remains a separate internal service so WebSocket and AI streaming stay isolated from the Next.js runtime.
- TLS automation is expected to be provided by the deployment platform, such as Dokploy Domains.
- Postgres is internal to the Compose network by default and is not published to the host.
- Backup, restore, external secret manager, observability, and multi-host deployment are not included yet.

## Dokploy

Use Dokploy's Docker Compose deployment flow against the repository root and the root `docker-compose.yml`.

Configure one domain for the `proxy` service on container port `80`. Dokploy can then terminate TLS and route the public domain to Inquara's single HTTP entrypoint.

Dokploy does not need `WEB_PORT`; it should route to the `proxy` service's container port `80`. Leave `WEB_PORT` unset unless you also want Docker to publish a host port outside Dokploy's domain routing.

Set these environment variables in Dokploy:

```dotenv
SESSION_SECRET=replace-with-at-least-32-random-characters
POSTGRES_PASSWORD=replace-with-a-strong-password
WEB_ORIGIN=https://your-inquara-domain.example
AI_PROVIDER=fake
```

When using a real OpenAI-compatible provider, set:

```dotenv
AI_PROVIDER=openai-compatible
OPENAI_COMPATIBLE_BASE_URL=https://your-provider.example/v1
OPENAI_COMPATIBLE_API_KEY=your-provider-key
OPENAI_COMPATIBLE_MODEL=your-model
```
