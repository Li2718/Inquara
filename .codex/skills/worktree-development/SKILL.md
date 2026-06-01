---
name: worktree-development
description: Use for Inquara repository-managed git worktree work, including creating or removing worktrees, deciding shared versus private infrastructure, cloning private worktree infrastructure, running dev servers from a worktree, and merge cleanup gates.
---

# Worktree Development

Use this skill whenever development should happen in a separate checkout without switching the main workspace.

## Core Rule

Do not create ad hoc worktrees for this repository when the managed workflow applies.

Use the repository commands:

```bash
npm run worktree:create <branch-name>
npm run worktree:cloneinfra
npm run worktree:remove <branch-name-or-path>
```

## Managed Directory

Managed worktrees live under `.worktrees/` by default. Use `worktrees/` only when that directory already exists and `.worktrees/` does not.

Both managed directory names must remain git-ignored.

## Creating A Worktree

Create from the main repository root:

```bash
npm run worktree:create <branch-name>
```

This creates a branch-backed git worktree and copies the main workspace `.env.dev`.

New worktrees default to:

- shared infrastructure: no local `docker-compose.dev.yml`
- shared database settings from `.env.dev`

## Infrastructure Modes

Default to shared infrastructure. A worktree without `docker-compose.dev.yml` uses the main workspace dev compose file and compose project.

Use private infrastructure only when the worktree needs infrastructure changes, such as compose edits, additional services, or different service ports.

A worktree is private-infrastructure mode when it has its own `docker-compose.dev.yml`. In that mode, `npm run dev` uses the current worktree compose file and compose project.

Create private infrastructure from inside the worktree:

```bash
npm run worktree:cloneinfra
```

This copies `docker-compose.dev.example.yml` to `docker-compose.dev.yml`, selects available PostgreSQL and Redis host ports, and writes worktree-local overrides to `.env.dev.local`.

Run `worktree:cloneinfra` before schema-changing, destructive database, or infrastructure work that must not affect the main workspace.

## Development Server

Run development from inside the relevant worktree:

```bash
npm run dev
```

Expected behavior:

- shared mode uses the main workspace infrastructure
- private mode uses the worktree-local infrastructure
- app server ports may shift when preferred ports are already occupied
- runtime state under `.local/dev/` records the API/Web origins and infrastructure fingerprint

## Removal

Remove managed worktrees with:

```bash
npm run worktree:remove <branch-name-or-path>
```

Before removing a worktree, stop any development services launched from that worktree. Use the target worktree's own runtime state:

```bash
npm run dev:stop
```

`npm run worktree:remove` also attempts this automatically when the target worktree has `.local/dev/*.pid` files. If removal fails because files are locked or ports remain open, stop the remaining process that was launched from the target worktree and retry removal; do not manually delete around a running worktree service.

Removal is strict: the target worktree's development services must be stopped, the target worktree must be clean, the current worktree cannot remove itself, tracked private databases are dropped, and the target branch is deleted.

## Merge And Cleanup Gate

When the user asks to merge a worktree back to `main` and clean it up, stop before merging and check whether the current worktree has a related active initiative under `docs/initiatives/`.

Use the branch name, changed files, commit messages, and initiative names to identify related initiative documentation. If none is related, state that no related initiative was found and continue with the normal merge and cleanup workflow.

If a related initiative exists:

- Read its `README.md`.
- Check its `archive_when` criteria.
- Check that durable conclusions have been reflected into current long-term docs before archiving.
- If the initiative satisfies the archive criteria, archive it first, then commit the archive change before merging back to `main`.
- If the initiative does not satisfy the archive criteria, stop and tell the user what is missing. Do not merge, remove, or clean up the worktree until the user explicitly confirms how to proceed.

Do not treat an active initiative as done merely because implementation tests pass. The initiative README's archive criteria are the gate.

## Safety Checklist

Before creating, cloning, or removing a worktree:

- Work only in the intended worktree path.
- Stop development services launched from the target worktree before removing it.
- Do not edit the main workspace unless explicitly requested.
- Use `worktree:cloneinfra` before modifying worktree infrastructure, changing schema, or doing destructive database work.
- Check related initiative archive readiness before merging and cleaning up a worktree.
- Keep worktree-local overrides in `.env.dev.local`.
- Treat ignored local files such as `docker-compose.dev.yml`, `.env.dev.local`, and `.local/dev/` as runtime state, not commit contents.
