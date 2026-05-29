# Setup App

> status: accepted
> decided_on: 2026-05-30
> scope: First-run setup for self-managed Inquara deployments.
> related_docs:
> - [Architecture](../architecture.md)
> - [Deployment](../deployment.md)
> - [Setup Initiative](../initiatives/setup/README.md)
> update_when:
> - The deployed web startup model changes.
> - Authentication, password identity, or user-role storage changes.
> - Deployment moves to a platform that cannot restart the web runtime after setup exits.
> - Setup needs to configure resources beyond the initial account.

## Background

Fresh self-managed deployments need a setup flow before normal product and administration pages are useful. This is installation-time behavior, not a normal product route.

The setup flow also has to fit Inquara's existing split architecture: Next.js handles the web surface, Fastify owns the API, and PostgreSQL stores users, password identities, sessions, workspaces, and redemption codes.

## Decision

Use a startup-selected setup app for deployed web runtime.

At web startup:

1. Connect to Postgres.
2. Check whether setup has already completed.
3. If setup is incomplete, start a small setup app.
4. If setup is complete, start the normal Next.js web app.

The setup app serves:

- `GET /` redirecting to `/setup`
- `GET /setup` rendering the setup form
- `POST /setup` completing setup
- `GET /api/health` for setup-app health checks

After successful setup, the setup app renders a completion page that polls until setup mode is gone, then exits. The deployment supervisor restarts the web runtime. On the next start, the setup completion check selects the normal web app.

## Consequences

The normal web app stays free of setup branches and does not own a permanent setup route.

The first setup step is centralized in a database helper so the setup app can create the initial account, password identity, and password hash without going through ordinary registration or redemption-code gating.

The deployed web container should use `scripts/web-start.mjs` as its entrypoint, which selects setup or normal mode at startup. Local development keeps the existing `npm run dev` flow.

## Safety Rules

Setup completion must be transactional and concurrency-safe. The transaction serializes setup attempts, re-checks that setup is still incomplete, and creates exactly one initial account with a password identity.

Setup pages must preserve non-secret form values after validation errors but never reflect submitted password values.

Setup browser errors should remain generic. Operational logs may record setup failure context without logging submitted passwords.
