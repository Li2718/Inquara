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

Local development uses `docker-compose.dev.yml` and `npm run dev`; it is separate from this production deployment path.

## Services

| Service | Type | Responsibility |
| --- | --- | --- |
| `postgres` | long-running infrastructure | Stores all application state. |
| `migrate` | one-shot | Runs Prisma migrations with `npm run db:migrate:deploy`, then exits. |
| `api` | long-running application | Runs the Fastify HTTP/WebSocket API on container port `4000`. |
| `web` | long-running application | Runs setup mode or normal Next.js web mode on container port `3000`. |

The long-running application services start only after the database is healthy and migrations have completed.

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

Important public URLs:

```dotenv
WEB_ORIGIN=http://localhost:3000
API_ORIGIN=http://localhost:4000
NEXT_PUBLIC_API_ORIGIN=http://localhost:4000
NEXT_PUBLIC_WS_ORIGIN=ws://localhost:4000
```

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

Equivalent command:

```bash
docker compose up --build -d
```

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
http://localhost:3000/setup
```

Create the initial account there. The setup flow creates the initial password user with administrator role, then exits setup mode. Docker restarts the web container into the normal product app.

The initial account is not created from environment variables and no default credentials are shipped.

## Health Checks

API health:

```text
http://localhost:4000/healthz
```

Web health:

```text
http://localhost:3000/api/health
```

The web health path exists in both setup mode and normal Next.js mode so Docker can keep one health check across the setup transition.

## Current Boundaries

- The first baseline exposes web and API as separate ports.
- No reverse proxy or TLS automation is included yet.
- Postgres is internal to the Compose network by default and is not published to the host.
- Backup, restore, external secret manager, observability, and multi-host deployment are not included yet.
