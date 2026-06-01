# WebSocket Reliability

> status: active
> owner: codex
> last_updated: 2026-06-01
> related_docs:
> - `docs/architecture.md`
> - `docs/ui-system.md`
> - `apps/web/src/shared/components/README.md`
> archive_when: WebSocket transport has been removed from the product path, the single-active-workspace lease model is fully documented in current docs, and the HTTP mutation and streaming behavior has replaced the old realtime path.

## Purpose

Replace the old project-wide WebSocket synchronization path with a simpler, more reliable product model: HTTP mutations, HTTP assistant streaming, and a single active editing client per workspace enforced by leases.

## Scope

This initiative now covers:

- removal of product WebSocket transport
- lease acquisition, renewal, release, and recovery for each workspace
- single-active-client takeover semantics
- deterministic waiter priority after takeover
- local-first canvas operations over HTTP
- assistant streaming over HTTP
- stale-blocking workspace UX
- shared client session state for active, recovering, and blocked-stale behavior

This initiative does not yet cover:

- admin pages
- authentication pages
- non-canvas HTTP CRUD flows
- workspace sidebar create, rename, and delete flows

## Hard Product Principles

1. All canvas operations must provide immediate local feedback first, then synchronize to the server afterward.
2. If synchronization fails, treat it as a communication-path failure rather than a small inline error.
3. When the client can no longer trust synchronization, the UI must enter a blocking stale-workspace state.
4. The blocking stale-workspace state must disable further workspace interaction and tell the user to wait for recovery.
5. After connectivity or lease ownership is restored, the client must reset from server truth before re-enabling interaction.
6. Shared canvases do not require multi-client concurrent editing. Each workspace allows exactly one active editor lease at a time.
7. A newer client may automatically take over the active editor lease for the same workspace.
8. When the active editor leaves, waiting clients must reacquire the lease using a deterministic priority order based on displacement order.

## Problem Statement

The current WebSocket interaction model is too fragile and too complex for the actual product need. Temporary network issues can leave the client disconnected without trustworthy recovery, and silent command failure is hard to distinguish from transport failure. The product does not need general multi-client live synchronization, so keeping WebSocket transport only adds failure modes without enough user value.

## Current Status

In progress.

The repository now has an isolated worktree and branch for this topic so design and implementation can proceed without disturbing the main workspace.

## Completed Work

- Created isolated worktree and branch: `canvas-realtime-sync`
- Opened this active initiative document as the source of truth for the work
- Wrote the replacement design and implementation plan
- Added Redis configuration to the shared config model
- Started lease service implementation and focused lease tests
- Began replacing product WebSocket paths with lease-aware HTTP routes and session state

## Remaining Work

- Finish replacing the remaining WebSocket assumptions in current docs and tests
- Complete end-to-end verification for lease takeover, stale blocking, and HTTP streaming
- Remove obsolete WebSocket dependencies and transport-specific environment wiring from the repo

## Deferred Or Out Of Scope

- Workspace sidebar CRUD and other HTTP-first flows
- Broader offline mode or queued background replay beyond the blocking recovery model
- Multi-user collaboration semantics
- Background synchronization for inactive or blocked workspace clients

## Next Step

Finish implementation and verification of the lease-based HTTP replacement, then write the durable rules back into `docs/architecture.md` and `docs/deployment.md`.
