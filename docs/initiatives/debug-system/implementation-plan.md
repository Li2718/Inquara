# Debug System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a development-only debug system that keeps product UI clean and is absent from production builds.

**Architecture:** The web app exposes a single `DebugRoot` entrypoint guarded by compile-time environment checks, with development-only panel modules and a production-free verification script. The API registers `/debug/*` routes only outside production. Repository rules and current architecture docs define the hard constraints.

**Tech Stack:** TypeScript, Next.js, React, Fastify, Vitest, Node scripts.

---

## File Structure

- Create `apps/web/src/debug/debugGuards.ts`: compile-time debug constants and marker strings.
- Create `apps/web/src/debug/DebugRoot.tsx`: product-safe entrypoint that returns `null` in production.
- Create `apps/web/src/debug/DebugRoot.dev.tsx`: development-only debug shell.
- Create `apps/web/src/debug/CanvasDebugPanel.dev.tsx`: canvas workspace diagnostics.
- Create `apps/web/src/debug/debugProductionScan.test.ts`: source-level production-safety regression checks.
- Create `apps/api/src/debug/routes.ts`: development-only API debug routes.
- Create `apps/api/src/debug/routes.test.ts`: API debug route registration tests.
- Create `scripts/verify-debug-free.mjs`: production build artifact scanner.
- Modify `apps/web/src/features/canvas/CanvasWorkspace.tsx`: remove product status overlay and add `DebugRoot`.
- Modify `apps/web/src/shared/styles.css`: remove product status styles and add intentionally non-product debug styles.
- Modify `apps/api/src/app.ts`: register debug routes only when not production.
- Modify `package.json`: add `verify:debug-free`.
- Modify `docs/architecture.md`: add debug system rules.
- Modify `docs/documentation-standards.md`: mention debug rules live in architecture.
- Modify `AGENTS.md`: add hard debug implementation rules.
- Modify `docs/initiatives/debug-system/README.md`: update status after implementation.

## Task 1: Web Debug Entrypoint

- [x] Write failing source-level tests that require `DebugRoot` to use a production guard and prohibit direct `.dev` imports from product feature modules.
- [x] Implement `debugGuards.ts`, `DebugRoot.tsx`, `DebugRoot.dev.tsx`, and `CanvasDebugPanel.dev.tsx`.
- [x] Move canvas session diagnostics from `WorkspaceSessionStatus` product overlay into `CanvasDebugPanel.dev.tsx`.
- [x] Remove `canvas-status-overlay` from `CanvasWorkspace.tsx`.
- [x] Add yellow/black debug floating button and panel styles.
- [x] Run focused web debug tests.

## Task 2: API Debug Routes

- [x] Write failing tests for `/debug/health` returning 200 in development and 404 in production.
- [x] Implement `apps/api/src/debug/routes.ts`.
- [x] Register debug routes in `buildApp` only when `NODE_ENV !== "production"`.
- [x] Add a source-level test that all debug route paths begin with `/debug/`.
- [x] Run focused API debug tests.

## Task 3: Production Debug-Free Verification

- [x] Write `scripts/verify-debug-free.mjs` to scan `apps/web/.next` for debug markers after a production build.
- [x] Add `verify:debug-free` to root `package.json`.
- [x] Ensure the scan fails on markers such as `INQUARA_DEBUG_PANEL`, `Canvas session debug`, `DebugFloatingButton`, and `/debug/`.
- [x] Run `npm --workspace @inquara/web run build`.
- [x] Run `npm run verify:debug-free`.

## Task 4: Hard Rules And Initiative Status

- [x] Update `docs/architecture.md` with debug system rules.
- [x] Update `AGENTS.md` with hard implementation constraints for debug code.
- [x] Update `docs/initiatives/debug-system/README.md` current status and next step.
- [x] Run full tests with `node --env-file=.env .\node_modules\vitest\vitest.mjs run`.
- [x] Run web build and debug-free verification.
- [x] Commit the completed debug system.

## Self-Review

- No debug UI should appear in product UI unless `NODE_ENV !== "production"`.
- No API debug route may use a path outside `/debug/*`.
- No debug code may expose secrets, raw cookies, API keys, or full environment variables.
- Production web build artifacts must not contain debug marker strings.
