# Canvas Organize Layout

> status: active
> owner: web
> updated: 2026-06-01
> related_docs:
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `docs/documentation-standards.md`
> - `apps/web/src/shared/components/README.md`
> archive_when:
> - the canvas organize control is implemented and verified in the browser
> - hidden-branch restore behavior no longer depends on stale absolute coordinates
> - the initiative README remaining-work list is empty or intentionally deferred
> - durable rules worth keeping are reflected back into current long-term docs

## Goal

Add a bottom-right canvas organize control that reflows visible chats into a compact mind-map-like hierarchy without changing dialog sizes or visibility state.

Hidden branches should no longer restore by preferring stale absolute coordinates. Instead, hidden subtree layout should be restored from parent-relative offsets so a restored branch follows the parent's current position after any later organize action.

## Scope

In scope for this initiative:

- one product-surface canvas organize button in the existing bottom-right floating control group
- one visible-node-only layout pass for the current canvas tree
- persistent position updates for visible nodes after organize
- preserving node width, node height, hidden state, collapsed state, and scroll state during organize
- hidden subtree snapshot changes needed to restore branches from parent-relative offsets
- recursive hidden-subtree restore based on current visible parent positions
- focused tests for layout calculation and hidden-branch restore behavior

Explicitly out of scope for this slice:

- reserving empty slots for hidden nodes during organize
- changing node resize behavior
- changing node hide/delete semantics beyond the restore-position model
- changing product page structure outside the existing canvas controls area
- new debug-only tooling for layout editing

## Confirmed Product Decisions

1. Organize should produce a compact current view and should not reserve gaps for hidden nodes.
2. Hidden nodes should not prefer their old absolute coordinates after organize.
3. Hidden subtree restore should follow the current visible parent position.
4. Relative-position restore applies to the whole hidden subtree, not only the branch root the user clicks to restore.
5. Organize must not change dialog width, dialog height, or hidden and visible state.

## Current Behavior Summary

Current canvas behavior uses absolute `x` and `y` coordinates for every node.

- Visible-node organize behavior does not exist yet.
- Hidden branch restore currently computes a collision-aware restore position only for the branch root and still uses the node's saved absolute coordinates as the restore ideal.
- Deeper hidden descendants keep their stored absolute coordinates when a subtree is restored.
- Hidden-state snapshots currently store `hiddenAt` and `scrollTop`, but not relative layout information.

This means a later organize action can move visible parents while hidden descendants still restore around stale absolute positions.

## Chosen Approach

Use two coordinated changes:

1. Add one canvas organize action that lays out only visible nodes in a compact hierarchy rooted from visible root chats.
2. Change hidden-subtree persistence so each hidden node stores its offset relative to its direct parent, then restore the whole subtree recursively from the current visible parent position.

The organize action will not inspect hidden nodes and will not leave placeholder gaps for them. Hidden branches will naturally reattach near the current parent location when restored.

## Implementation Notes

1. Keep the organize control in the existing `CanvasViewportControls` area unless implementation reveals a shared control abstraction is missing.
2. Put reusable layout math in focused feature files instead of embedding it directly in `CanvasView.tsx`.
3. Prefer one new workspace command for batch organize persistence if per-node position commands would create unnecessary event churn or inconsistent intermediate states.
4. Update hidden snapshot schema and API parsing together so web, domain, and API stay aligned.
5. Preserve subtree-relative shape by restoring each node from its direct parent's restored position, not from the branch root alone.

## Completed Work

- Classified this documentation as active initiative documentation.
- Confirmed the repository requires managed worktree workflow for isolated branch work.
- Created the managed worktree `canvas-organize-layout`.
- Audited the current canvas controls, node position persistence, and hidden-branch restore flow.
- Confirmed the product decision to keep organize compact and to avoid reserving space for hidden nodes.
- Confirmed hidden-branch restore should follow parent-relative layout for the whole hidden subtree.
- Added a bottom-right canvas organize control in the existing floating controls area.
- Added one shared visible-node hierarchy layout helper in `@inquara/domain`.
- Added one batch `node.organize` command path through domain, realtime, API, and web command creators.
- Updated hidden subtree snapshots to store parent-relative offsets plus scroll state.
- Updated hidden branch restore to rebuild the whole subtree from the current visible parent position.
- Added focused tests for visible-node organize layout, hidden subtree relative offsets, and canvas service behavior.
- Verified focused typecheck and focused canvas tests pass in the worktree.

## Remaining Work

- Verify the behavior in the browser.

## Deferred Or Out Of Scope

- Automatically organizing the canvas after every branch creation or restore.
- Reworking branch edge rendering style beyond whatever movement naturally results from new positions.
- Adding alternate organize modes such as horizontal-only, radial, or manual pinning.
