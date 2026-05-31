# Setup

> status: archived
> purpose: Design and implement the first-run setup flow for self-managed Inquara deployments.

## Goal

Create a complete first-run setup flow for fresh self-managed deployments. A new deployment must be able to initialize itself without default credentials, password-bearing environment variables, or setup branches left inside the normal product request path.

The first implemented setup step creates the initial account and grants it administrator role. Future setup steps may configure product settings, registration policy, model settings, or other deployment-level options.

## Boundary

### Included

- Add a startup-time selector for deployed web runtime:
  - if setup is incomplete, serve the setup app
  - if setup is complete, serve the normal web app
- Add a small setup app dedicated to first-run initialization.
- The setup app exposes:
  - `GET /` redirecting to `/setup`
  - `GET /setup` rendering the setup form
  - `POST /setup` completing the first setup step
  - `GET /api/health` for deployment health checks
- The current setup form collects email, display name, password, and password confirmation for the initial account.
- The initial account receives `role = "admin"`.
- Create the password identity data needed by Inquara's existing auth model.
- Re-check inside a transaction that setup is still incomplete before inserting the account.
- Protect concurrent submissions so only one setup account can be created.
- Exit the setup app after successful setup so the deployment supervisor can restart the web service into normal mode.
- Update deployment/startup documentation and long-term architecture docs.
- Add behavior-focused tests for startup selection, setup server behavior, and setup database creation.

### Not Included

- OAuth setup.
- General user registration redesign.
- Invite/redemption-code generation as part of the setup form.
- Multi-admin management screens.
- Password reset or account recovery.
- Deployment platform implementation beyond the startup script and documented runtime contract.
- Keeping `/setup` available after setup is complete.

## Working Rule

This initiative README is the source of truth for live task status. When audit, discussion, design, or implementation changes the task list, update the progress sections before continuing implementation.

## Reference From aitestkit

AITestKit uses a startup-selected setup app:

- The web container startup script checks whether setup has already happened.
- If setup is incomplete, it starts a small setup app.
- If setup is complete, it starts the normal Next app.
- The setup app serves `/setup`, completes initialization, then exits.
- Docker or the deployment platform restarts the web container.
- On the next startup, normal web starts because setup is complete.

The important ideas to preserve are:

- no default credentials
- no setup password in environment variables
- no setup route in the normal product app
- one-time setup decided at process startup, not per product request
- transactional setup completion with an in-transaction re-check

## Inquara-Specific Design Direction

- Keep setup completion logic in `packages/db`, close to Prisma and shared auth helpers, because the setup app runs outside the Fastify API process.
- Keep reusable password hashing in the database/auth support layer so setup and API password auth do not duplicate hash format code.
- The setup app is a small Node HTTP app, not a Next route, so normal product pages do not carry setup branches.
- The startup selector lives in `scripts/web-start.mjs`, used by the Docker web entrypoint instead of exposing a manual production npm command.
- The startup selector calls `hasCompletedSetup()` instead of embedding Prisma query details in the script.
- The setup app lives in `scripts/setup-server.mjs` and depends on injected setup completion behavior in tests.
- Local `npm run dev` keeps its current development behavior unless this initiative explicitly changes it.
- The general `packages/db/src/seed.ts` entrypoint should not exist. If demo data is needed later, add an explicitly named local-only script such as `db:seed:demo`.
- The redemption-code system must not block setup. The setup form creates the initial account outside ordinary registration.
- The setup app should not call the normal registration route because registration may require a redemption code and because setup must assign the initial account role atomically.

## Initial Decisions

- Use a startup-selected setup app, not a permanent `/setup` route in Next.js.
- Use `scripts/web-start.mjs` as the Docker web entrypoint.
- Use `scripts/setup-server.mjs` for the setup app.
- Keep setup strictly on the web runtime. The API service does not gain a setup mode in this slice.
- After successful setup, show a success page that waits for normal mode and schedule process exit.
- Do not set a session cookie from the setup app in the first slice. After restart, the user signs in through the normal password login form.
- Setup account creation inserts the user, password identity, and password hash in one database transaction.
- The transaction locks or otherwise serializes setup completion before re-checking that setup is still incomplete.
- Prefer a PostgreSQL table lock or transaction-level advisory lock plus in-transaction setup-state check over an optimistic count-only check.
- `hasCompletedSetup()` may use an efficient existence query and should not require a full user count.
- Setup browser errors should be generic. Server logs may contain operational context but must not include submitted passwords.
- A formal decision record is warranted because the choice affects deployment, auth, startup behavior, and future maintenance.

## Implementation Shape

### Database And Auth Helpers

- Add `hasCompletedSetup(prisma?)`.
- Add `createSetupAccount(input, prisma?)`.
- Normalize email in the same way as password registration.
- Validate email format and password length consistently with normal auth.
- Store `role = "admin"` for the initial account.
- Create the `password` identity row.
- Reuse the same password hash format as API login.
- Keep setup creation separate from redemption-code registration gating.

### Startup Selector

- Add `scripts/web-start.mjs`.
- Decide startup mode with `decideWebStartupMode(setupCompleted)`.
- If setup is incomplete, start the setup server.
- If setup is complete, spawn the normal web start command for `@inquara/web`.
- Preserve `SERVER_HOST` and `SERVER_PORT` style configuration for deployable runtime.
- Keep local development startup unchanged unless a later deployment task explicitly changes it.

### Setup Server

- Add `scripts/setup-server.mjs`.
- Serve only:
  - `GET /` -> redirect to `/setup`
  - `GET /setup` -> setup form
  - `POST /setup` -> validate form and complete setup
  - `GET /api/health` -> setup health
- Render a small branded HTML page without depending on Next.js.
- Escape all reflected form values.
- Preserve entered email/display name after validation errors.
- Never preserve or log submitted password values.
- After success, render setup-finished page that polls until setup mode is gone, then schedule exit.

## Safety Requirements

- Do not ship default credentials.
- Do not store setup passwords in `.env`, Compose files, GitHub Actions, or logs.
- Do not log submitted passwords.
- Do not promote an existing normal user through setup.
- If setup is already complete, setup creation must fail.
- Setup completion must be atomic.
- Concurrent setup submissions must not create two setup accounts.
- Setup health checks must not reveal sensitive state beyond setup app health.
- The setup app should show generic setup errors in the browser while preserving actionable server logs that do not include secrets.

## Open Deployment Questions

- Which production process manager or deployment platform will restart the web runtime after setup exits?
- What exact deployed start command should be used once deployment packaging is formalized?
- Whether a later deployment task should add container/Compose files for this project.

## Completed Work

- Created the Setup initiative.
- Reviewed aitestkit's current setup design and implementation.
- Chose the initial Inquara setup architecture: startup selector, standalone setup server, shared database helper, no setup route in normal Next runtime, no setup-created login session cookie.
- Removed the default `db:seed` command and `packages/db/src/seed.ts` so the project no longer has a general seed entrypoint that creates demo data or credential-bearing accounts.
- Removed `ADMIN_EMAIL` / `ADMIN_PASSWORD` from application configuration.
- Updated architecture documentation with the setup model.
- Added a decision record for the setup app.
- Added current deployment documentation for the deployed web startup selector.
- Added `createSetupAccount()` and `hasCompletedSetup()` database helpers.
- Added the setup server script.
- Added the deployed web startup selector script for the future Docker web entrypoint.
- Added behavior-focused tests for setup database creation, setup server behavior, and startup selection.
- Kept demo data out of default setup; future demo data must use an explicitly named local-only script.
- Verified `lint`, `typecheck`, direct Node script imports, targeted tests, and the full test suite locally.
- Renamed the initiative, decision, code APIs, and setup UI copy to setup language.

## Remaining Work

- None.

## Deferred Work

- Additional setup steps beyond the initial account.
- Full deployment automation.
- Backup/restore setup.
- Account recovery.
- Additional administrator management UX.
- OAuth-aware setup.

## Related Documents

- [Architecture](../../../architecture.md)
- [Deployment](../../../deployment.md)
- [Documentation Standards](../../../documentation-standards.md)
- [Redemption Codes](../2026-05-31-redemption-codes/README.md)

## Archive Criteria

- Fresh deployment with incomplete setup starts the setup app.
- Initialized deployment starts the normal web app.
- Setup account creation is atomic and safe under concurrent submission.
- No default credentials or password-bearing environment variables are required.
- Normal product runtime does not carry a persistent `/setup` route or setup gate.
- Development/demo seed behavior remains clearly separate from setup.
- Durable architecture/deployment documentation reflects the final setup model.
- `lint`, `typecheck`, relevant tests, and CI pass.
