# Chat Message Rendering

> status: archived
> owner: web
> updated: 2026-06-02
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
- Removed assistant bubble surface styling while keeping user messages visually distinct.
- Added feature-owned markdown parsing and rendering for headings, paragraphs, lists, blockquotes, fenced code, inline formatting, links, images, thematic breaks, task lists, tables, table alignment, and escaped table pipes.
- Added KaTeX rendering for `$...$`, `\(...\)`, `\[...\]`, and `$$...$$` math content.
- Preserved source offset metadata for rendered text fragments so selection follow-ups and branch highlights still map back to raw message content.
- Mapped selections inside KaTeX-rendered formula DOM back to the whole formula source range so formula follow-ups remain usable.
- Disabled pointer hit-testing on KaTeX formula decoration layers so radical SVGs do not block starting text selections inside square-root content.
- Added focused Vitest coverage for markdown rendering and source range mapping.
- Verified the implemented renderer with focused Vitest coverage and web typecheck before the final feature checkpoint.
- Committed implementation checkpoints:
  - `df8ebff feat: render node chat markdown messages`
  - `88f1c96 feat: expand chat markdown rendering`
  - `98b505f feat: support richer markdown edge cases`
  - `a482bcb feat: stabilize math selection ranges`

## Remaining Work

- None for this archived slice.

## Deferred Or Out Of Scope

- Full CommonMark compliance beyond the formats that current node chat content needs most often.
- Promoting the renderer into a shared UI layer before a second real use site exists.
- Full nested markdown support such as multi-paragraph list items, deeply nested lists, and complex nested blockquotes.
- Fine-grained character-level source mapping inside KaTeX-rendered formula internals.
- Follow-up refinement for formula text selection and toolbar behavior, tracked outside this archived initiative.
- Integration closeout checks such as full lint and debug-free verification belong to the eventual merge or release closeout, not this archived feature slice.
