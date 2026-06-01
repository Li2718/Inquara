# Chat Message Rendering Design

## Summary

This initiative changes only the product node chat presentation layer.

Stored message content remains markdown text. The UI adds a feature-owned renderer that turns markdown into React elements while preserving source offsets for each visible text fragment. That offset metadata lets the existing selection-follow-up and branch source highlight features continue to target the original message string.

## Structure

- `apps/web/src/features/node-chat/MessageMarkdown.tsx`
  - feature-owned renderer for node chat markdown output and source-highlight decoration
- `apps/web/src/features/node-chat/messageMarkdownModel.ts`
  - small markdown parser and source-aware block model
- `apps/web/src/features/node-chat/sourceRange.ts`
  - source-range recovery helper for rendered markdown fragments
- `apps/web/src/features/node-chat/MessageList.tsx`
  - swaps plain-text rendering for markdown rendering and uses source-aware range recovery
- `apps/web/src/shared/styles.css`
  - updates message layout and markdown presentation

## Key Constraint

The message renderer must keep source ranges aligned to the raw markdown string, not only the visible text. Without that, existing branch highlights and follow-up quote creation would drift whenever markdown syntax hides characters from the rendered output.

## Trade-Off

This slice uses a small feature-owned parser instead of adding a new dependency. That keeps the change self-contained inside the isolated worktree and avoids dependency installation risk, at the cost of supporting a practical markdown subset rather than full CommonMark.
