# Canvas Organize Layout Implementation Plan

> status: archived
> owner: web
> updated: 2026-06-02
> related_docs:
> - `docs/archive/2026/2026-06-02-canvas-organize-layout/README.md`
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `apps/web/src/shared/components/README.md`
> archived_reason: implementation completed; retained as historical plan

## Goal

Implement a compact canvas organize action for visible nodes and switch hidden subtree restore from stale absolute coordinates to recursive parent-relative positioning.

## Architecture

The work splits into two cooperating parts:

1. A visible-node-only layout calculation on the web client that persists new node coordinates without changing size, hidden state, or scroll state.
2. A hidden-subtree snapshot and restore model that stores each hidden node's offset from its direct parent and rebuilds the whole subtree from the current visible parent position during restore.

## File Map

Original expected primary code touch points:

- `apps/web/src/features/canvas/CanvasView.tsx`
  - add the organize control wiring and invoke the new layout helper
- `apps/web/src/features/canvas/`
  - add focused layout helper files and tests instead of embedding tree layout math into `CanvasView.tsx`
- `apps/web/src/features/node-chat/branchPlacement.ts`
  - replace restore-position logic that currently prefers saved absolute coordinates
- `apps/web/src/features/node-chat/MessageList.tsx`
  - restore hidden branches through the new recursive behavior
- `apps/web/src/features/commands/createCommands.ts`
  - add any new command creator needed for batch position persistence
- `packages/domain/src/commands.ts`
  - add command schema for organize persistence if batch persistence is introduced
- `packages/domain/src/schemas.ts`
  - extend hidden snapshot schema for parent-relative offsets
- `apps/api/src/canvas/service.ts`
  - persist parent-relative hidden snapshot data and restore subtree coordinates recursively
- `apps/api/src/workspace-commands/service.ts`
  - route the new organize command through the HTTP lease command flow used by main
- `apps/api/src/test/canvas.test.ts`
  - add API coverage for organize persistence and recursive restore behavior
- `apps/web/src/shared/components/ui/icons.tsx`
  - add a shared organize icon if the current icon set has no good match
- `apps/web/src/shared/styles.css`
  - adjust the existing canvas floating controls styling if the new control needs label or spacing changes

## Planned Task Order

1. Finalize the persistence shape for organize and hidden restore.
2. Implement the domain/API contract.
3. Add the canvas organize UI and visible-tree layout calculation.
4. Add focused web and API tests.
5. Verify the flow in the browser.

## Decisions Locked In

1. Organize acts on visible nodes only.
2. Hidden nodes do not reserve slots during organize.
3. Hidden subtree restore follows the current visible parent position.
4. Relative positioning applies recursively to the whole hidden subtree.
5. Dialog size and hidden/visible state must remain unchanged.

## Resolved Implementation Choice

Implementation used one new batch command for organize persistence so all position updates share one mutation.

After main removed WebSocket sync, the command was routed through `apps/api/src/workspace-commands/service.ts` and the web workspace session HTTP command sender instead of any realtime WebSocket route.
