# Chat Message Rendering

> status: active
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
- Added focused Vitest coverage for markdown rendering and source range mapping.
- Committed implementation checkpoints:
  - `df8ebff feat: render node chat markdown messages`
  - `88f1c96 feat: expand chat markdown rendering`
  - `98b505f feat: support richer markdown edge cases`

## Remaining Work

- Run authenticated product-page visual acceptance against representative real messages in the in-app browser.
- Decide whether formula branch highlights need fine-grained mapping inside KaTeX-rendered content, or whether block-level formula source ranges are sufficient for this initiative.
- Run final verification before integration, including focused Vitest coverage, web typecheck, lint, and the required debug-free production check if a production build is part of the closeout.

## Deferred Or Out Of Scope

- Full CommonMark compliance beyond the formats that current node chat content needs most often.
- Promoting the renderer into a shared UI layer before a second real use site exists.
- Full nested markdown support such as multi-paragraph list items, deeply nested lists, and complex nested blockquotes.
