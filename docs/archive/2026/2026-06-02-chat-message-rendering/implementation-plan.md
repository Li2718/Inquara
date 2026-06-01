# Chat Message Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render node chat messages as markdown, remove assistant bubble styling, and preserve selection/highlight source mapping.

**Architecture:** Keep the change inside the node chat feature. Add a feature-owned markdown parser and renderer that annotate visible text fragments with original source offsets, then update `MessageList` and product message styles to consume that renderer without changing stored message content.

**Tech Stack:** React 19, Next.js 15, TypeScript, Vitest, KaTeX, product CSS in `apps/web/src/shared/styles.css`

---

### Task 1: Lock Down Markdown Rendering Expectations

**Files:**
- Test: `apps/web/src/features/node-chat/MessageMarkdown.test.tsx`
- Test: `apps/web/src/features/node-chat/sourceRange.test.ts`

- [x] Add a markdown rendering regression test for headings, emphasis, lists, and fenced code.
- [x] Add a regression test that proves branch highlights can target visible text inside markdown formatting syntax.
- [x] Add a source-range regression test that maps rendered text-node offsets back to raw markdown offsets.
- [x] Add regression coverage for tables, task lists, strikethrough, images, thematic breaks, table alignment, escaped table pipes, and math delimiters.
- [x] Add regression coverage for selections inside nested KaTeX-rendered formula DOM.

### Task 2: Implement Feature-Owned Markdown Rendering

**Files:**
- Create: `apps/web/src/features/node-chat/messageMarkdownModel.ts`
- Create: `apps/web/src/features/node-chat/MessageMarkdown.tsx`

- [x] Implement a small markdown block and inline parser for node chat output.
- [x] Render text fragments with source-offset metadata.
- [x] Apply branch highlight decoration against source ranges instead of raw plain-text slicing.
- [x] Render math content through KaTeX for `$...$`, `\(...\)`, `\[...\]`, and `$$...$$`.

### Task 3: Integrate The Renderer Into Node Chat

**Files:**
- Modify: `apps/web/src/features/node-chat/MessageList.tsx`
- Modify: `apps/web/src/features/node-chat/sourceRange.ts`

- [x] Replace the plain paragraph wrapper with the markdown renderer.
- [x] Recover selected source ranges from rendered markdown text fragments before falling back to string search.
- [x] Recover selections inside KaTeX-rendered formula DOM to the whole formula source range.
- [x] Keep the existing follow-up and branch-toggle behavior unchanged from the caller's perspective.

### Task 4: Update Product Message Styling And Verify

**Files:**
- Modify: `apps/web/src/shared/styles.css`

- [x] Remove assistant bubble styling while preserving readable product message layout.
- [x] Style markdown blocks, inline code, code fences, lists, blockquotes, links, tables, images, task lists, and math for both assistant and user messages.
- [x] Keep KaTeX radical decoration layers from intercepting text selection starts.
- [x] Run final focused Vitest coverage and web typecheck before archiving this feature slice.

### Remaining Acceptance Work

- Formula selection and toolbar behavior may need a follow-up slice if the product needs finer-grained formula selection than whole-formula source mapping.
- Full integration closeout verification, including lint and debug-free checks when applicable, belongs to the eventual merge or release closeout.
