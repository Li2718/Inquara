# Chat Message Rendering

> status: active
> owner: web
> updated: 2026-06-01
> related_docs:
> - `docs/ui-system.md`
> - `apps/web/src/shared/components/README.md`
> archive_when:
> - assistant and user messages render markdown through one stable product message renderer
> - assistant replies no longer use bubble styling in the product canvas chat UI
> - the initiative README remaining-work list is empty or intentionally deferred

## Goal

Update the product node chat message presentation so that:

- assistant replies are no longer visually wrapped in chat bubbles
- both assistant and user messages render markdown in the message list
- the text-selection follow-up flow and source highlight behavior remain usable

## Scope

In scope for this initiative:

- product-surface node chat message rendering in `apps/web/src/features/node-chat/`
- one feature-owned markdown renderer that can preserve source offsets for selection and highlights
- message styling updates for assistant and user message display
- focused tests for markdown rendering and source offset mapping

Out of scope for this slice:

- rich-text editing inside the composer
- admin or debug surfaces
- server-side message format changes
- introducing a shared markdown system for unrelated product surfaces

## Chosen Approach

Use one feature-owned markdown renderer for node chat messages.

The renderer will:

- parse common markdown blocks and inline formatting without changing the stored message content
- wrap rendered text fragments with source-offset metadata so selection and branch highlight logic can map back to the original markdown string
- keep branch highlight interactions working by decorating rendered text fragments instead of slicing the raw message as plain text

Visual changes will:

- remove the assistant bubble surface treatment
- keep user messages visually distinct
- style rendered markdown elements with product-safe message typography and spacing

## Completed Work

- Classified this documentation as active initiative documentation.
- Confirmed the target surface is `product`.
- Audited the current message rendering and source selection implementation.
- Chose a feature-owned markdown renderer instead of adding a cross-surface shared component.
- Created the isolated managed worktree `chat-message-rendering`.

## Remaining Work

- Add failing tests for markdown rendering and source offset recovery.
- Implement the markdown renderer and source-offset mapping helpers.
- Update node chat rendering and message styles.
- Run focused tests plus web typecheck and lint verification.

## Deferred Or Out Of Scope

- Full CommonMark compliance beyond the formats that current node chat content needs most often.
- Promoting the renderer into a shared UI layer before a second real use site exists.
