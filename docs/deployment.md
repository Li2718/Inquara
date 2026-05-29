# Deployment

> status: active
> purpose: Define the current self-managed runtime contract for starting Inquara services.

## Current Scope

This document covers the current deployable runtime contract. Full production packaging, release automation, backup, restore, and hosting-provider-specific setup are not defined yet.

## Web Runtime

Production deployment should start the web runtime through Docker. The web container entrypoint should run:

```bash
node scripts/web-start.mjs
```

That script chooses the correct web mode at process startup:

- if setup is incomplete, it starts the setup app
- if setup is complete, it starts the normal Next.js web app

The local developer workflow remains:

```bash
npm run dev
```

Local development does not automatically enter setup mode.

## Setup

On a fresh deployment, the setup app serves `/setup` on the web port. The operator completes setup by entering an email, display name, password, and password confirmation for the initial account.

After setup succeeds, the setup app shows a completion page, polls until setup mode is gone, and exits. Docker should restart the web container. After restart, `scripts/web-start.mjs` sees that setup is complete and starts the normal web app.

The user then signs in through the normal login form.

## Runtime Configuration

The deployed web runtime uses the same database connection as the rest of the application through `DATABASE_URL`.

`SERVER_HOST` and `SERVER_PORT` may be used to control the host and port for both setup mode and normal web mode. Defaults are:

- `SERVER_HOST=0.0.0.0`
- `SERVER_PORT=3000`

## Health Check

During setup mode, `GET /api/health` returns a setup-app health response.

Normal application health endpoints remain owned by their respective services.
