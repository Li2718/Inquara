# Documentation Standards

> status: active
> purpose: Define the long-term documentation structure, naming rules, and lifecycle rules for this repository.

## Core Standard

This repository organizes documentation so that a first-time contributor can quickly find the current source of truth and separate it from active work plans or historical reference material.

## Documentation Roles

This repository uses three documentation roles now:

- current long-term documentation
- active initiative documentation
- archived historical documentation

Decision records may be added later under `docs/decisions/` only when a decision is cross-cutting, long-lived, and likely to need a standalone explanation.

## Current Docs

Current long-term docs live directly under `docs/` with stable topic names.

Current docs explain:

- what the product or system is
- how the system works now
- what rules future contributors should follow

Current docs must not be named with dates, milestone codes, sprint labels, or temporary planning words.

Current docs in this repository:

- `docs/architecture.md`
- `docs/deployment.md`
- `docs/documentation-standards.md`
- `docs/multilingual.md`
- `docs/testing-standards.md`
- `docs/ui-system.md`

Debug implementation rules are current long-term architecture rules and live in `docs/architecture.md`. Initiative docs may plan changes to the debug system, but durable constraints must be reflected back into the architecture document.

UI implementation rules are current long-term product rules and live in `docs/ui-system.md`. Component placement and discovery rules are documented in `apps/web/src/shared/components/README.md`.

## Active Initiatives

Active initiative docs live under `docs/initiatives/<topic>/`.

Each initiative must use `README.md` as its stable entrypoint. Extra files should be added only when the initiative is too large for one readable entrypoint.

Initiative docs explain:

- what work is currently being planned or executed
- what is included and excluded
- the current status
- the next concrete step
- related long-term docs
- archive criteria

When an initiative's real status changes, update its `README.md` in the same change.

Initiative docs are the source of truth for initiative progress. If an audit, discussion, or implementation step creates or changes a task list, write that task list into the initiative `README.md` before continuing with more implementation work. Do not leave active initiative tasks only in chat history.

Each active initiative that spans more than one small change must keep explicit progress sections, such as:

- completed work
- remaining work
- deferred or out-of-scope work

## Archive

Archived docs live under `docs/archive/<year>/<yyyy-mm-dd-topic>/` when this repository needs retained historical context.

Archive is not the source of truth. Durable conclusions from an initiative must be written back into current docs before that initiative is archived.

## Naming Rules

1. Use stable, understandable `kebab-case` topic names.
2. Do not use stage codes, sprint codes, milestone shorthand, numeric-only identifiers, or temporary names as primary document names.
3. Use dates only where time is the essential organizing dimension, such as archive packages.
4. Prefer `README.md` for initiative and archive entrypoints.

## Same-Change Update Rule

If a document contains live status or current-state guidance, update it in the same change that alters that status or guidance.
