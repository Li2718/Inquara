# Chat Message Rendering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render node chat messages as markdown, remove assistant bubble styling, and preserve selection/highlight source mapping.

**Architecture:** Keep the change inside the node chat feature. Add a feature-owned markdown parser and renderer that annotate visible text fragments with original source offsets, then update `MessageList` and product message styles to consume that renderer without changing stored message content.

**Tech Stack:** React 19, Next.js 15, TypeScript, Vitest, product CSS in `apps/web/src/shared/styles.css`

---

### Task 1: Lock Down Markdown Rendering Expectations

**Files:**
- Test: `apps/web/src/features/node-chat/MessageMarkdown.test.tsx`
- Test: `apps/web/src/features/node-chat/sourceRange.test.ts`

- [ ] Add a markdown rendering regression test for headings, emphasis, lists, and fenced code.
- [ ] Add a regression test that proves branch highlights can target visible text inside markdown formatting syntax.
- [ ] Add a source-range regression test that maps rendered text-node offsets back to raw markdown offsets.

### Task 2: Implement Feature-Owned Markdown Rendering

**Files:**
- Create: `apps/web/src/features/node-chat/messageMarkdownModel.ts`
- Create: `apps/web/src/features/node-chat/MessageMarkdown.tsx`

- [ ] Implement a small markdown block and inline parser for node chat output.
- [ ] Render text fragments with source-offset metadata.
- [ ] Apply branch highlight decoration against source ranges instead of raw plain-text slicing.

### Task 3: Integrate The Renderer Into Node Chat

**Files:**
- Modify: `apps/web/src/features/node-chat/MessageList.tsx`
- Modify: `apps/web/src/features/node-chat/sourceRange.ts`

- [ ] Replace the plain paragraph wrapper with the markdown renderer.
- [ ] Recover selected source ranges from rendered markdown text fragments before falling back to string search.
- [ ] Keep the existing follow-up and branch-toggle behavior unchanged from the caller's perspective.

### Task 4: Update Product Message Styling And Verify

**Files:**
- Modify: `apps/web/src/shared/styles.css`

- [ ] Remove assistant bubble styling while preserving readable product message layout.
- [ ] Style markdown blocks, inline code, code fences, lists, blockquotes, and links for both assistant and user messages.
- [ ] Run focused Vitest coverage, `npm run typecheck --workspace @inquara/web`, and `npm run lint`.
