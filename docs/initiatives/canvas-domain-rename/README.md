# Canvas Domain Rename

> status: active
> owner: codex
> last_updated: 2026-06-02
> related_docs:
> - `docs/architecture.md`
> - `docs/multilingual.md`
> - `docs/testing-standards.md`
> - `docs/ui-system.md`
> - `apps/web/src/shared/components/README.md`
> archive_when: Product code, database schema, current docs, and tests consistently use canvas for the product domain concept; excluded tooling and historical documentation remain intentionally unchanged; verification has passed; durable naming rules have been reflected into current long-term docs when needed.

## Purpose

Unify the product domain name so the object users edit is consistently called a canvas instead of mixing workspace and canvas.

## Scope

In scope for this initiative:

- product/domain code where workspace previously meant the editable product object
- database schema, migrations, model names, table names, and field names for that product object
- API routes, route parameters, services, schemas, events, commands, and tests for the product object
- web routes, feature modules, visible product copy, shared message dictionaries, and e2e tests
- current long-term docs and active initiative docs when they describe the current product concept

Explicitly out of scope:

- npm, package manager, monorepo, Turborepo, and tooling uses of workspace or workspaces
- Codex, editor, shell, environment, and local checkout uses of workspace
- managed git worktree terminology
- archived historical docs under `docs/archive/**`
- unrelated product behavior changes

## Guardrails

1. Do not perform a blind repository-wide text replacement.
2. Classify each workspace occurrence as product-domain, tooling, historical, or environment before changing it.
3. Keep English as the source product UI language and update `en` and `zh-CN` together.
4. Use structured schema and route migrations where available instead of string-only edits.
5. Keep backward compatibility decisions explicit for URLs, API aliases, and database migrations.
6. Do not commit local absolute paths, screenshots, or worktree-local infrastructure files.

## Current Status

Implementation and verification are complete in the isolated worktree.

## Completed Work

- Created isolated worktree and branch: `canvas-domain-rename`
- Classified this README as active initiative documentation
- Captured scope exclusions for tooling, environment, worktree, and archive terminology
- Prepared private worktree infrastructure for schema-safe development
- Audited the first terminology boundary:
  - product-domain occurrences include Prisma `Canvas`, `canvases`, `canvasId`, `canvas_id`, API `/canvases`, web `/canvases/[canvasId]`, canvas lease/session names, product messages, and current docs
  - tooling occurrences include npm `workspaces`, npm `--workspace`, `scripts/run-workspace.mjs`, worktree terminology, local checkout terminology, and Next output file tracing root
  - historical docs under `docs/archive/**` remain excluded
- Added a repository terminology guard test that fails on product-domain workspace remnants while allowing tooling and archive exclusions
- Renamed the domain package schemas, commands, events, reducer, and tests to canvas terminology
- Renamed Prisma model, table, relation fields, indexes, and the init migration to canvas terminology
- Added a follow-up database migration that conditionally renames existing `workspaces` and `workspace_id` database objects to `canvases` and `canvas_id`
- Renamed product API services, routes, lease coordination, command dispatch, and tests to canvas terminology
- Renamed product web routes from `/workspaces/[workspaceId]` to `/canvases/[canvasId]`
- Renamed web feature modules, session state, sidebar, visible copy, and e2e expectations to canvas terminology
- Updated current docs and active initiative references outside `docs/archive/**`
- Verified with full test, typecheck, lint, production web build, debug-free scan, and diff whitespace checks

## Remaining Work

- Commit the completed migration branch

## Deferred Or Out Of Scope

- Changing npm or monorepo workspace terminology
- Rewriting historical archive docs
- Redesigning the canvas editing experience beyond terminology consistency

## Next Step

Commit the completed migration branch.
