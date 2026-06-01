# Worktree Development

> status: active
> purpose: Define the managed git worktree workflow for local Inquara development, including when and how to clone a private development database.

## Scope

This document defines the required local workflow for creating, isolating, and removing repository-managed git worktrees.

Use this workflow whenever development work should happen in a separate branch checkout without switching the main workspace.

## Core Rule

Do not create ad hoc worktrees for this repository when the managed workflow applies.

Use the repository worktree commands instead:

```bash
npm run worktree:create <branch-name>
npm run worktree:cloneinfra
npm run worktree:clonedb
npm run worktree:remove <branch-name-or-path>
```

These commands are the current source of truth for the worktree lifecycle.

## Managed Directory

Managed worktrees live under:

- `.worktrees/` when present or when the repository creates the managed directory for the first time
- `worktrees/` only when that directory already exists and `.worktrees/` does not

Both managed directory names are git-ignored by the repository.

## Creation Workflow

Create a new managed worktree from the repository root:

```bash
npm run worktree:create <branch-name>
```

What this does:

- creates a new git worktree under the managed worktree directory
- creates a new branch for that worktree
- copies the main workspace `.env.dev` into the new worktree

Initial worktree infrastructure mode is shared. A newly created worktree does not get its own `docker-compose.dev.yml`; `npm run dev` uses the main workspace development infrastructure by default.

Initial worktree database mode is also shared. A newly created worktree starts by using the same development database settings as the main workspace until you explicitly switch it to a private cloned database.

## Private Infrastructure Workflow

Most worktrees should reuse the main workspace infrastructure. If a worktree needs to change development infrastructure itself, such as changing `docker-compose.dev.yml`, adding infrastructure services, or changing service ports, give that worktree an explicit private infrastructure copy first.

A managed worktree is considered private-infrastructure mode when it has its own `docker-compose.dev.yml`. In that mode, `npm run dev` uses the current worktree's compose file and compose project instead of the main workspace infrastructure.

Create the private infrastructure copy from inside the worktree:

```bash
npm run worktree:cloneinfra
```

What `worktree:cloneinfra` does:

- copies `docker-compose.dev.example.yml` to `docker-compose.dev.yml` in the current worktree
- finds available host ports for PostgreSQL and Redis, avoiding ports already published by Docker containers
- writes the worktree-local port overrides to `.env.dev.local`

After this step, `npm run dev` starts and uses the worktree's private compose project.

Keep worktree-local infrastructure overrides in `.env.dev.local` when possible. Do not use private infrastructure merely to isolate application data; use the private database workflow for that.

## Private Database Workflow

When a worktree needs database isolation, run this command from inside that worktree:

```bash
npm run worktree:clonedb
```

This workflow is required before schema-changing or destructive database work inside a worktree, including:

- Prisma schema and migration work
- database reset or cleanup experiments
- any task that should not change the main development database seen by other worktrees

What `worktree:clonedb` does:

- reads the current worktree branch name
- creates a private PostgreSQL database by cloning the current source development database
- writes the private database override into `.env.dev.local`
- runs `npm run db:migrate:deploy` against the cloned database

After this step, commands run from that worktree use the private database defined in `.env.dev.local`.

Do not run `worktree:clonedb` twice in the same worktree. If a worktree already has a private database, keep using it or remove the worktree and create a fresh one.

## Environment Rules

The main workspace must have a valid `.env.dev` before creating a managed worktree.

Local development env precedence for worktrees is:

```text
.env.dev.local
.env.dev
```

Use `.env.dev.local` only for worktree-local overrides such as the private cloned database name. Keep shared development defaults in `.env.dev`.

## Removal Workflow

Remove a managed worktree from another worktree or the main workspace:

```bash
npm run worktree:remove <branch-name-or-path>
```

Removal is intentionally strict:

- the target worktree must have no uncommitted changes
- the current worktree cannot remove itself
- if the target worktree has a tracked private database, that database is dropped as part of removal
- the target branch is deleted after the worktree is removed

## Expected Usage

Use the default shared database mode for lightweight branch isolation when database shape and data safety are not at risk.

Switch to `worktree:clonedb` before doing work that can diverge schema or mutate development data in ways that should stay private to one worktree.

If this workflow changes, update this document, the managed scripts, and any AGENTS rules in the same change.
