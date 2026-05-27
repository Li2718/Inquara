# Project AGENTS.md

## Documentation Rules

All documentation work in this repository must follow:

- [docs/documentation-standards.md](<repo-root-placeholder>/docs/documentation-standards.md)
- [.codex/skills/documentation-governance/SKILL.md](<repo-root-placeholder>/.codex/skills/documentation-governance/SKILL.md)

Use these rules as hard constraints, not optional style guidance.

### Classification

Before creating, moving, renaming, or archiving any documentation, classify it into exactly one bucket:

1. long-term current documentation
2. design decision record
3. active initiative documentation
4. archived historical documentation

Do not create a document until its bucket is clear.

### Naming

1. Use stable, understandable topic names.
2. Do not use milestone codes, stage codes, numeric-only identifiers, or temporary names as primary names.
3. Use dates only where the documentation system explicitly requires them.

### Initiatives

If the repository uses `docs/initiatives/`:

1. Each initiative must live under `docs/initiatives/<topic>/`.
2. Use `README.md` as the initiative entrypoint.
3. Keep initiative status current in the same change that alters reality.

### Decisions

If the repository uses `docs/decisions/`:

1. Use them sparingly.
2. Require `related_docs` and `update_when`.
3. If a related current doc changes materially, check and update the related decision in the same change.

### Archive

If the repository uses `docs/archive/`:

1. Treat it as retained historical context, not the current source of truth.
2. Keep archived package names time-oriented if time is the archive's primary lookup axis.

## Debug Rules

Debug implementation work must follow the hard rules in [docs/architecture.md](<repo-root-placeholder>/docs/architecture.md).

1. Web debug UI must be mounted once from `apps/web/src/app/layout.tsx` through `apps/web/src/debug/DebugRoot.tsx`.
2. Product pages may publish page-specific debug data only through product-safe debug source entrypoints such as `apps/web/src/debug/DebugCanvasSource.tsx`; they must not render debug UI directly.
3. Development-only debug UI files must use `.dev.ts` or `.dev.tsx` filenames.
4. Product feature modules outside `apps/web/src/debug/` must not import `.dev` debug modules directly.
5. Debug UI must look visibly non-product and include a clear debug marker, but it should still be usable and visually intentional.
6. Debug API routes must use `/debug/*` paths only.
7. Debug API routes must not be registered in production.
8. Debug code must not expose secrets, raw cookies, API keys, database URLs, or full environment objects.
9. Production web builds must pass `npm run verify:debug-free` before completion.

## Test Database Rules

Database-backed tests must follow the hard rules in [docs/architecture.md](<repo-root-placeholder>/docs/architecture.md).

1. API, database integration, WebSocket, and Playwright e2e tests that write data must use the shared ephemeral PostgreSQL setup based on `testcontainers`.
2. Do not let destructive tests default to the development `DATABASE_URL` from `.env`.
3. Do not put direct database cleanup such as `deleteMany()` in individual test files; use the shared test database helper.
4. Playwright e2e tests must be launched through the repository e2e wrapper so all processes share the same temporary database.
5. If Docker or `testcontainers` fails, stop and report the blocker instead of silently replacing the setup with a simplified workaround.

## Development Database Rules

Development database changes must follow the hard rules in [docs/architecture.md](<repo-root-placeholder>/docs/architecture.md).

1. After modifying the Prisma schema or adding/changing a database migration, check whether a local development server is running.
2. If a local development server is running, apply the development database migration before asking the user to continue using the app.
3. Do not leave the running development server connected to an unmigrated development database.
4. If migration cannot be applied, stop and report the blocker instead of letting the user debug stale database-shape errors in the browser.
