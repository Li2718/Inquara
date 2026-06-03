# New Canvas Experience

> status: active
> owner: web
> updated: 2026-06-02
> related_docs:
> - `docs/ui-system.md`
> - `docs/architecture.md`
> - `docs/multilingual.md`
> - `apps/web/src/shared/components/README.md`
> archive_when:
> - the new canvas experience improvements are implemented or intentionally deferred
> - the remaining-work list is empty or intentionally deferred
> - durable canvas, UI, or architecture rules worth keeping are reflected back into current long-term docs

## Goal

Improve the new canvas experience so creating, opening, and working in a canvas feels clearer, faster, and more forgiving for product users.

The initiative should make the canvas experience:

- easier to start before a real canvas record exists
- quicker to create a canvas from the user's first question
- calmer when loading, saving, recovering, or switching context
- consistent with the shared UI system and product surface rules
- fully localized for the supported interface locales

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
- database schema or infrastructure changes unless later implementation proves they are required

## Known Risks

1. Canvas UI is product-surface work, so reusable interactions should be promoted into shared components rather than hidden inside page files or feature views.
2. Empty and recovery states can easily drift from the real synchronization model; product copy must stay accurate about what the user can safely do.
3. New product copy must update both supported locales in the same change.
4. Debug affordances must remain mounted through the central debug root and must not leak into product canvas components.
5. The new-canvas entrypoint must not create a database canvas until the user submits the first message.

## Current Status

Started.

The repository now has an isolated managed worktree and branch for this topic so canvas experience design and implementation can proceed without disturbing the main checkout.

## Completed Work

- Classified this documentation as active initiative documentation.
- Created isolated worktree and branch: `new-canvas-experience`.
- Opened this active initiative document as the source of truth for the work.
- Clarified that the new-canvas empty state exists before canvas creation and must cache its input draft across canvas switches.

## Remaining Work

- Replace new-canvas creation entrypoints with a pre-create route or surface that does not create a canvas immediately.
- Add a centered, locked starter input with a taller field and send action.
- Cache the starter input draft when users switch to another canvas and return to new-canvas entry.
- On send, create the canvas and submit the starter message into its first node.
- Animate the starter input into the first canvas node shape after send.
- Update `en` and `zh-CN` product messages for any changed user-visible copy.
- Run typecheck, lint, relevant tests, and browser verification for the changed workflow.
- Reflect durable rules back into current long-term docs if the initiative establishes new canvas or UI constraints.

## Deferred Or Out Of Scope

- New admin-specific canvas management.
- Additional locales.
- Private worktree infrastructure unless this initiative later requires schema, destructive database, or service changes.

## Next Step

Audit the current canvas creation and first-use workflow, then choose the first implementation slice with the best user-experience impact.
