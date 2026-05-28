# Documentation Standards

> status: draft
> purpose: Define the long-term documentation structure, naming rules, and lifecycle rules for this repository.

## Core Standard

This repository should organize documentation so that a first-time contributor, years later, can quickly find the right document.

## Top-Level Roles

This repository uses these documentation roles:

- current long-term docs
- active initiative docs
- archived historical docs
- decision docs

## Naming Rules

1. Prefer stable topic names in `kebab-case`.
2. Do not use stage codes, sprint codes, milestone shorthand, numeric-only identifiers, or temporary names as primary names.
3. Use dates only where time is the essential organizing dimension.

## Current Docs

Current docs should explain:

- what the system is
- how it works now
- what the current rules are

## Initiatives

If this repository uses `initiatives/`:

- use `initiatives/<topic>/README.md` as the stable entrypoint
- keep initiative structure minimal by default
- update initiative status immediately when progress changes
- treat the initiative README as the source of truth for live task lists
- write audit, discussion, design, or implementation task-list changes into the initiative README before continuing implementation
- do not leave active initiative tasks only in chat history or temporary summaries
- for initiatives spanning more than one small change, keep explicit progress sections such as completed work, remaining work, and deferred or out-of-scope work
- archive initiatives only after durable conclusions are written back into current docs

## Archive

If this repository uses `archive/`:

- treat it as retained historical context, not the current source of truth
- do not assume it covers every historical change
- prefer simple time-based organization

## Decisions

If this repository uses `decisions/`:

- use it sparingly
- only create decision docs for high-leverage, cross-cutting, long-lived why topics
- require explicit `status`, `related_docs`, and `update_when`

## Same-Change Update Rule

If a doc contains live status or current-state guidance, update it in the same change that altered reality.
