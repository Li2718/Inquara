# New Canvas Experience

> status: archived
> owner: web
> updated: 2026-06-04
> related_docs:
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `docs/multilingual.md`
> - `apps/web/src/shared/components/README.md`
> archived_from: `docs/initiatives/new-canvas-experience/`
> archived_reason: implementation completed, verified, committed, and remaining follow-up work intentionally deferred
> archive_when:
> - the new canvas experience improvements are implemented or intentionally deferred
> - the remaining-work list is empty or intentionally deferred
> - durable canvas, UI, or architecture rules worth keeping are reflected back into current long-term docs

## Goal

Improve the new canvas experience so creating, opening, and working in a canvas feels clearer, faster, and more forgiving for product users.

The initiative focused on making canvas creation feel continuous, avoiding premature database record creation, preserving draft input before creation, and polishing the surrounding canvas chrome and first-node transition.

## Scope

In scope for this initiative:

- product-surface canvas experience and empty states
- pre-create canvas entry flow from canvas navigation into the first question
- cached pre-create input draft when users switch away and return
- canvas toolbar, status, and recovery affordances when they affect first-use clarity
- loading, stale, disabled, and ready states visible around the canvas
- shared UI components needed by multiple canvas or product surfaces
- focused tests and browser verification for changed workflows

Explicitly out of scope for this slice:

- debug-only canvas tooling
- admin pages
- broad visual rebranding outside the canvas workflow
- changing the supported locale set beyond `en` and `zh-CN`
- database schema or infrastructure changes

## Completed Work

- Created isolated worktree and branch: `new-canvas-experience`.
- Added a pre-create new-canvas entry state so `/canvases/new` does not create a canvas until the first message is submitted.
- Cached the new-canvas starter draft so switching away and returning preserves the typed input.
- Added starter submission flow that creates the canvas, sends the first message, and hands off into the persisted first node.
- Refined the starter-to-node morph animation so composer, send button, node shell, and dividers match the final node appearance.
- Fixed starter message handoff so the user message and response appear without requiring refresh.
- Added automatic title behavior:
  - main chat and canvas initially use the first question, then receive a generated descriptive title
  - follow-up chats can title from selected text and first follow-up question
  - independent chats title from their first question and generated title
- Configured the development simple-task model as `gpt-5.4-mini`.
- Improved login and canvas-load error surfacing so failures use the existing product error screen path instead of silent reloads.
- Fixed canvas delete dialog loading state so repeated deletes do not reopen with stale `deleting` state.
- Updated canvas sidebar list refresh so newly created canvases appear before a full page refresh.
- Stabilized sidebar open and close behavior:
  - sidebar expansion squeezes the canvas instead of overlaying it
  - collapsed sidebar leaves only the floating button and does not reserve a visual strip over the canvas
  - canvas viewport compensation preserves visual center through sidebar and window-size changes
- Improved canvas brand readability over nearby canvas content with a subtle text stroke and shadow while keeping the brand fully visible.
- Verified focused tests, TypeScript checks, ESLint checks for touched TypeScript files, browser checks for key UI states, and diff whitespace checks during implementation.

## Remaining Work

None for this initiative.

## Deferred Or Out Of Scope

- Additional alternate brand/chrome collision treatments beyond the accepted text-stroke readability polish.
- New admin-specific canvas management.
- Additional locales.
- Private worktree infrastructure or database schema changes.

## Verification

- `node node_modules/vitest/vitest.mjs run apps/web/src/features/canvas/stageLayoutCompensation.test.ts apps/web/src/features/canvas/viewportStability.test.ts apps/web/src/features/canvas/rootNodeFocus.test.ts apps/web/src/features/canvas/newCanvasTransition.test.ts`
- `tsc -p apps/web/tsconfig.json --noEmit`
- `eslint apps/web/src/features/canvas/CanvasView.tsx apps/web/src/features/canvas/stageLayoutCompensation.ts apps/web/src/features/canvas/stageLayoutCompensation.test.ts apps/web/src/features/canvases/CanvasSidebar.tsx`
- Browser verification on `http://localhost:3000/canvases/new` and active canvas pages during implementation
- `git diff --check`

## Durable Documentation Notes

No new long-term UI, architecture, multilingual, or debug-system rule was created by this initiative. Existing current documentation already covers the durable constraints used here: product UI uses shared components where appropriate, product copy stays localized across supported locales, and debug UI remains isolated from product pages.

## Next Step

None.
