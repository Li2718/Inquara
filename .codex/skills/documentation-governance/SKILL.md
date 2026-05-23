---
name: documentation-governance
description: Use when designing, organizing, or migrating documentation systems in a software repository, especially when defining current docs, initiatives, archive, decisions, naming rules, and reusable templates.
---

# Documentation Governance

Use this skill when a repository needs a durable documentation system, not just one-off docs.

This skill is the transferable layer:

- how to classify docs
- how to separate current docs from initiative docs and archive docs
- when to create decision records
- how to keep documentation discoverable and maintainable

If you need deeper rationale, read:

- `references/documentation-principles.md`

If you need files to copy into a project, use:

- `assets/templates/documentation-standards.md`
- `assets/templates/initiative-readme.md`
- `assets/templates/decision.md`
- `assets/templates/decisions-index.md`
- `assets/templates/agents-documentation-rules.md`

## Required Workflow

Before changing a documentation system:

1. Classify the doc or doc set into one of these buckets:
   - current long-term documentation
   - active initiative documentation
   - archived historical documentation
   - decision documentation
2. Check whether names depend on internal slang, milestone codes, numeric-only identifiers, or temporary wording.
3. Decide whether the repository needs:
   - only current docs
   - current docs plus initiatives
   - current docs plus initiatives plus archive
   - current docs plus decisions
4. Keep the system as small as possible while still supporting future contributors.

## Naming Rules

1. Prefer stable topic names in `kebab-case`.
2. Do not use project-stage codes, sprint labels, or milestone shorthand as primary names.
3. Do not use numeric-only decision identifiers as the main retrieval mechanism.
4. Use dates only when the information is inherently time-based, such as archive packages.

## Initiative Rules

If a repository uses `initiatives/`:

1. Treat it as the active work area, not a permanent storage area.
2. Use `initiatives/<topic>/README.md` as the stable entrypoint.
3. Keep initiative structure minimal by default.
4. Make initiative status a live field that must be updated immediately when progress changes.
5. When an initiative is archived, keep the same `README.md` and update it rather than switching to a separate archive-only template.

## Archive Rules

If a repository uses `archive/`:

1. Archive is for retained historical context and lookup support, not for the current source of truth.
2. Do not assume archive must cover every historical change.
3. Prefer a simple time-based archive structure.
4. If initiative packages are archived, use the archive date in the archived directory name.

## Decision Rules

Use `decisions/` sparingly.

A decision record is usually warranted only when at least two of these are true:

1. The choice affects multiple long-term docs or subsystems.
2. The choice involved meaningful trade-offs.
3. Future contributors are likely to ask why this choice exists.
4. Replacing the choice would have real migration cost.

Each decision should:

1. Use a stable topic name.
2. Include explicit status.
3. Link to the current docs it explains.
4. Include `update_when` so future contributors know what changes should trigger a re-check.

## Migration Guidance

When migrating this system into another repository:

1. Copy the relevant templates from `assets/templates/`.
2. Adapt naming and directory rules to the new repository's actual scope.
3. Add repository-specific hard rules to that repository's `AGENTS.md` or equivalent.
4. Keep project-specific history and path names out of the reusable skill body.
