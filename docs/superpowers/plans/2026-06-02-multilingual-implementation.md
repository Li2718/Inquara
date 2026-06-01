# Multilingual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the multilingual standard with English as the default source locale, Chinese translations, shared dictionaries, locale persistence, formatting helpers, a language switcher, and product/admin UI wiring.

**Architecture:** Add shared locale, message, and formatter modules under `apps/web/src/shared/`. Mount a client locale provider from the root layout, then consume shared messages from client surfaces while server/global surfaces read request locale helpers where possible. Keep routing unchanged and preserve current product IA.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, shared Inquara UI components.

---

### Task 1: Shared Locale, Messages, And Formatters

**Files:**
- Create: `apps/web/src/shared/locale/index.ts`
- Create: `apps/web/src/shared/messages/index.ts`
- Create: `apps/web/src/shared/format/index.ts`
- Test: `apps/web/src/shared/locale/index.test.ts`
- Test: `apps/web/src/shared/messages/index.test.ts`
- Test: `apps/web/src/shared/format/index.test.ts`

- [x] **Step 1: Write failing tests for locale parsing, message completeness, and locale-aware formatting.**
- [ ] **Step 2: Run focused tests and confirm they fail because the modules do not exist.**
- [ ] **Step 3: Implement the shared modules.**
- [ ] **Step 4: Run focused tests and confirm they pass.**

### Task 2: Locale Provider And Language Switcher

**Files:**
- Create: `apps/web/src/shared/locale/LocaleProvider.tsx`
- Create: `apps/web/src/shared/components/chrome/LanguageMenu.tsx`
- Modify: `apps/web/src/shared/components/chrome/index.ts`
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Add provider and language menu implementation.**
- [ ] **Step 2: Mount provider from root layout using request locale.**
- [ ] **Step 3: Add language menu to shared top bar.**
- [ ] **Step 4: Run typecheck-focused verification.**

### Task 3: Product UI Dictionary Wiring

**Files:**
- Modify: `apps/web/src/features/auth/LoginPage.tsx`
- Modify: `apps/web/src/shared/components/chrome/AppTopBar.tsx`
- Modify: `apps/web/src/features/workspaces/WorkspaceListPage.tsx`
- Modify: `apps/web/src/features/workspaces/WorkspaceSidebar.tsx`
- Modify: `apps/web/src/features/canvas/CanvasWorkspace.tsx`
- Modify: `apps/web/src/features/canvas/CanvasView.tsx`
- Modify: `apps/web/src/features/canvas/CanvasNodeView.tsx`
- Modify: `apps/web/src/features/node-chat/MessageComposer.tsx`
- Modify: `apps/web/src/features/workspace-session/WorkspaceLeaseBlocker.tsx`
- Modify: `apps/web/src/shared/components/product/ErrorScreen.tsx`
- Modify: `apps/web/src/app/not-found.tsx`
- Modify: `apps/web/src/app/global-error.tsx`

- [ ] **Step 1: Replace product UI static copy with shared messages.**
- [ ] **Step 2: Replace locale-sensitive date output with shared formatters.**
- [ ] **Step 3: Keep dynamic user, workspace, provider, and error payload text unmodified.**

### Task 4: Admin UI Dictionary Wiring

**Files:**
- Modify: `apps/web/src/features/admin/RedemptionCodesAdminPage.tsx`

- [ ] **Step 1: Replace admin static copy with shared messages.**
- [ ] **Step 2: Replace admin dates and status labels with shared formatters/messages.**
- [ ] **Step 3: Preserve invitation codes, emails, notes, and raw source values as dynamic data.**

### Task 5: Documentation And Verification

**Files:**
- Modify: `docs/initiatives/multilingual-standards/README.md`
- Modify: `apps/web/src/shared/components/README.md`

- [ ] **Step 1: Update component docs for the language menu and locale provider entrypoint.**
- [ ] **Step 2: Update initiative progress.**
- [ ] **Step 3: Run focused tests, typecheck, lint, and debug-free verification.**
