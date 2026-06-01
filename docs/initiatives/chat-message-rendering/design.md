# Chat Message Rendering Design

## Summary

This initiative changes only the product node chat presentation layer.

Stored message content remains markdown text. The UI adds a feature-owned renderer that turns markdown into React elements while preserving source offsets for each visible text fragment. That offset metadata lets the existing selection-follow-up and branch source highlight features continue to target the original message string.

## Structure

- `apps/web/src/features/node-chat/MessageMarkdown.tsx`
  - feature-owned renderer for node chat markdown output and source-highlight decoration
- `apps/web/src/features/node-chat/messageMarkdownModel.ts`
  - small markdown parser and source-aware block model
- `apps/web/src/features/node-chat/mathRender.ts`
  - KaTeX-backed math renderer for formula tokens parsed by the message markdown model
- `apps/web/src/features/node-chat/sourceRange.ts`
  - source-range recovery helper for rendered markdown fragments
- `apps/web/src/features/node-chat/MessageList.tsx`
  - swaps plain-text rendering for markdown rendering and uses source-aware range recovery
- `apps/web/src/app/layout.tsx`
  - imports KaTeX's global stylesheet for formula rendering
- `apps/web/src/shared/styles.css`
  - updates message layout and markdown presentation

## Key Constraint

The message renderer must keep source ranges aligned to the raw markdown string, not only the visible text. Without that, existing branch highlights and follow-up quote creation would drift whenever markdown syntax hides characters from the rendered output.

## Trade-Off

This slice uses a small feature-owned parser for practical markdown coverage instead of adopting a full CommonMark pipeline. That keeps source-offset behavior explicit and local to node chat, at the cost of supporting a practical subset rather than full CommonMark.

Math rendering is the exception: formulas use KaTeX instead of hand-rendered text because the product needs real mathematical layout, not styled LaTeX source. The parser still owns delimiter detection and source offsets; KaTeX owns the formula DOM.

Selections inside KaTeX-rendered DOM map back to the whole formula source range. This keeps follow-up creation and branch visibility usable for formulas without depending on KaTeX's internal markup shape.

KaTeX radical notation uses SVG decoration layers for the square-root mark. Those decoration layers should not receive pointer events inside message math, otherwise the browser can fail to start a text selection from inside the radicand.
