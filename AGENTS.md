# Project AGENTS.md

## Documentation Rules

All documentation work in this repository must follow:

- [docs/documentation-standards.md](docs/documentation-standards.md)
- [.codex/skills/documentation-governance/SKILL.md](.codex/skills/documentation-governance/SKILL.md)

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

## Repository Hygiene Rules

1. Do not commit local workstation absolute paths in code, tests, documentation, configuration, fixtures, or snapshots.
2. This applies to every collaborator and operating system, including Windows drive paths and UNC paths, macOS and Linux home directories, WSL mount paths, temporary directories, and workspace checkout directories.
3. Use repository-relative paths, fixture-relative paths, placeholders such as `<repo-root>`, URLs, documented environment variables, or runtime-discovered paths instead.
4. If a real absolute path must exist at runtime, it must be supplied by the user's local environment and kept out of committed source files.
5. New tests or examples must not use fake local absolute paths as fixtures; model paths with relative test data unless the behavior specifically requires path-format parsing.

## Debug Rules

Debug implementation work must follow the hard rules in [docs/architecture.md](docs/architecture.md).

1. Web debug UI must be mounted once from `apps/web/src/app/layout.tsx` through `apps/web/src/debug/DebugRoot.tsx`.
2. Product pages may publish page-specific debug data only through product-safe debug source entrypoints such as `apps/web/src/debug/DebugCanvasSource.tsx`; they must not render debug UI directly.
3. Development-only debug UI files must use `.dev.ts` or `.dev.tsx` filenames.
4. Product feature modules outside `apps/web/src/debug/` must not import `.dev` debug modules directly.
5. Debug UI must look visibly non-product and include a clear debug marker, but it should still be usable and visually intentional.
6. Debug API routes must use `/debug/*` paths only.
7. Debug API routes must not be registered in production.
8. Debug code must not expose secrets, raw cookies, API keys, database URLs, or full environment objects.
9. Production web builds must pass `npm run verify:debug-free` before completion.

## UI System Rules

All UI work must follow:

- [docs/ui-system.md](docs/ui-system.md)
- [apps/web/src/shared/components/README.md](apps/web/src/shared/components/README.md)

Use these rules as hard constraints, not optional style guidance.

### Minimal Long-Term UI Rules

1. Distinguish `UI rules` from `design style`.
2. Reuse shared UI components before writing page-local UI.
3. Add missing shared abstractions to the component library before using them in pages.
4. Prefer semantic tokens over hard-coded colors, borders, shadows, spacing, and typography.
5. Keep page information architecture stable across display modes unless explicitly redesigned.
6. The product currently supports `light` only unless a future task explicitly adds another display mode.
7. Keep readability, operation clarity, and maintainability above decoration.
8. Before creating any new UI component, search existing shared components first.
9. Do not implement reusable UI interaction directly inside `page.tsx`, `chrome`, product/domain views, or feature views if it belongs in shared UI.
10. Do not place page-only or parent-component-only UI into the shared component library.
11. If an action creates a new database record that appears in a managed list, default to a button plus modal, drawer, or wizard unless the user explicitly asks for inline creation or creation is the page's only core task.

### Surface Rules

When adding or changing pages or UI components, classify them into one of these surfaces first:

1. `product`
2. `admin`
3. `debug`

Then follow these rules:

1. Product pages are the normal authenticated Inquara workspace experience.
2. Admin pages must use an explicit admin route and centralized admin guard when they exist.
3. Debug UI must follow the Debug Rules above and the architecture rules in `docs/architecture.md`.
4. Do not treat debug as a hidden runtime branch inside normal product pages.
5. Product pages must not depend on debug-only components.
6. Admin pages must not depend on debug-only components.
7. Product pages should not directly depend on admin-only components.
8. If multiple surfaces need the same component, extract it upward into a shared layer instead of cross-importing between surfaces.

### How To Find Components

Before creating or editing UI, follow this search order:

1. Read [apps/web/src/shared/components/README.md](apps/web/src/shared/components/README.md).
2. Check relevant barrel exports under `apps/web/src/shared/components/**/index.ts` when they exist.
3. Search `apps/web/src/shared/components/` for likely names and usages.
4. Search `apps/web/src/features/` for feature-owned components that may need to remain private or be promoted.
5. Decide whether the component belongs to `product`, `admin`, or `debug`.
6. Only create a new component after confirming the existing shared layers do not already cover the need.

This is a required workflow, not a suggestion.

### Component Placement Rules

Use these directories as fixed shared layers:

- `apps/web/src/shared/components/ui/`
  - Shared generic UI primitives and reusable interactions.
  - Examples: button, icon button, popup menu, modal, tabs, input, badge, tooltip, shared icons.
- `apps/web/src/shared/components/chrome/`
  - App-level frame and navigation components.
  - Examples: product shell, top controls, global sidebar primitives.
- `apps/web/src/shared/components/product/`
  - Product-surface reusable components that are not generic enough for `ui`.
  - Examples: workspace navigation pieces, account menu compositions.
- `apps/web/src/shared/components/domain/`
  - Domain-composed components built from lower shared layers.
  - Examples: reusable canvas or node compositions that are not feature-private.
- `apps/web/src/shared/components/admin/`
  - Future admin-surface reusable components.
  - Create only when admin UI exists.

Debug UI belongs under `apps/web/src/debug/` unless `docs/architecture.md` explicitly defines a different production-excluded shared debug layer.

Use these private placement rules for non-shared components:

1. Page-only components go under a same-name private directory beside the page file.
2. Parent-component-only subcomponents go under a same-name private directory beside the parent component.
3. Component-local styles and assets should live in that same-name private directory when they are not shared.
4. If a component could be reused by multiple pages or multiple toolbar/surface locations, it must not stay inside a page file.

### Icon Rules

1. Do not hand-draw routine product icons as inline SVG in page or feature components.
2. Prefer the shared icon source in `apps/web/src/shared/components/ui/icons.ts` when available.
3. Default to outline icons for routine product UI such as toolbars, menus, buttons, filters, and tables.
4. Use filled icons only for explicit exceptions such as external brand marks or deliberate high-emphasis semantic treatment.
5. Reuse shared icon presets for size and stroke before setting custom values.
6. Keep icon stroke style, size rhythm, and optical weight consistent within the same surface.

### Forbidden UI Shortcuts

Do not do these unless the user explicitly approves a temporary exception:

1. Do not hand-roll reusable dropdown, modal, tab, table, or menu behavior directly inside page files, chrome, product/domain views, or feature views.
2. Do not create a second component that overlaps an existing shared component because the existing one was not searched for.
3. Do not place reusable UI under `app/**` when it belongs under `shared/components/**`.
4. Do not place page-only or parent-component-only pieces into `shared/components/**` just to make the owner file shorter.
5. Do not leave a reusable component unindexed if future sessions would struggle to discover it.
6. Do not use browser `alert`, `confirm`, or `prompt` for product UI.

### UI Definition Of Done

Before closing a UI task, verify:

1. Existing shared components were searched first.
2. Shared components and private components were separated correctly.
3. New reusable logic was placed in the correct shared layer.
4. Page and feature files compose shared components instead of owning generic interactions.
5. Shared exports or component docs were updated when needed.
6. `typecheck`, `lint`, and relevant build checks still pass.

## Test Database Rules

All test creation, deletion, and modification must follow [docs/testing-standards.md](docs/testing-standards.md).

Use these rules as hard constraints, not optional style guidance. Tests must reduce real product or engineering risk and should be judged by the value framework in the testing standard, not by mechanical coverage or incidental implementation details.

Database-backed tests must follow the hard rules in [docs/architecture.md](docs/architecture.md).

1. API, database integration, WebSocket, and Playwright e2e tests that write data must use the shared ephemeral PostgreSQL setup based on `testcontainers`.
2. Do not let destructive tests default to the development `DATABASE_URL` from `.env`.
3. Do not put direct database cleanup such as `deleteMany()` in individual test files; use the shared test database helper.
4. Playwright e2e tests must be launched through the repository e2e wrapper so all processes share the same temporary database.
5. If Docker or `testcontainers` fails, stop and report the blocker instead of silently replacing the setup with a simplified workaround.

## Development Database Rules

Development database changes must follow the hard rules in [docs/architecture.md](docs/architecture.md).

1. After modifying the Prisma schema or adding/changing a database migration, check whether a local development server is running.
2. If a local development server is running, apply the development database migration before asking the user to continue using the app.
3. Do not leave the running development server connected to an unmigrated development database.
4. If migration cannot be applied, stop and report the blocker instead of letting the user debug stale database-shape errors in the browser.

## Development Server Build Rules

Development server and build verification work must follow the hard rules in [docs/architecture.md](docs/architecture.md).

1. Before running a production web build such as `npm --workspace @inquara/web run build`, check whether a local Next development server is running for this repository.
2. Do not run a production Next build against `apps/web/.next` while `next dev` is serving the browser, because the build can rewrite `.next` and break the active dev server with missing chunk errors.
3. If a production web build is required while the user is using the local app, stop the development server first, or use an explicitly isolated build/output environment.
4. After any production build that may have touched `apps/web/.next`, restart `npm run dev` before asking the user to continue using `localhost:3000`.
5. If this rule is violated and the browser shows missing Next chunk/module errors, restart the development server immediately and verify the affected route in the browser.

## Worktree Rules

Managed git worktree work must follow the repo-local skill at [.codex/skills/worktree-development/SKILL.md](.codex/skills/worktree-development/SKILL.md).
