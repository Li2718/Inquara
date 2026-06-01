# WebSocket Reliability Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace project-wide WebSocket workspace synchronization with HTTP mutations, HTTP assistant streaming, and a Redis-backed single-active-workspace lease model.

**Architecture:** The API will expose lease and mutation HTTP routes, validate a workspace lease epoch for every write, and stream assistant events over HTTP. The web app will manage a session-scoped lease, apply optimistic local mutations, and block stale clients instead of trying to live-sync multiple active editors.

**Tech Stack:** Fastify, Prisma, Redis, Next.js, React, Zustand, Vitest, Playwright

---

### Task 1: Document And Stabilize The Target Architecture

**Files:**
- Modify: `docs/initiatives/websocket-reliability/README.md`
- Create: `docs/superpowers/specs/2026-06-01-websocket-reliability-design.md`
- Create: `docs/superpowers/plans/2026-06-01-websocket-reliability.md`

- [ ] Capture the initiative scope, design, and implementation plan in repository docs.

### Task 2: Add Redis Configuration And Lease Service

**Files:**
- Modify: `packages/config/src/index.ts`
- Modify: `packages/config/src/index.test.ts`
- Modify: `apps/api/package.json`
- Create: `apps/api/src/leases/service.ts`
- Create: `apps/api/src/test/leases.test.ts`

- [ ] Add `REDIS_URL` to shared config.
- [ ] Add a Redis client dependency for the API.
- [ ] Implement a lease service that supports acquire, renew, release, status, and waiter-priority reacquire.
- [ ] Cover lease rules with focused API-side tests.

### Task 3: Replace WebSocket Command Handling With HTTP Mutation Routes

**Files:**
- Modify: `apps/api/src/http/routes.ts`
- Modify: `apps/api/src/app.ts`
- Delete: `apps/api/src/realtime/ws.ts`
- Delete: `apps/api/src/realtime/hub.ts`
- Delete: `apps/api/src/test/realtime.test.ts`
- Modify: `apps/api/src/canvas/service.ts`
- Modify: `packages/domain/src/commands.ts`

- [ ] Add lease-aware HTTP routes for command mutations.
- [ ] Extend create-command payloads to accept client-supplied IDs where optimistic creation needs stable persistence.
- [ ] Remove WebSocket registration from the API.

### Task 4: Replace WebSocket Message Sending With HTTP Streaming

**Files:**
- Modify: `apps/api/src/messages/service.ts`
- Modify: `apps/api/src/http/routes.ts`
- Create: `apps/api/src/test/message-stream-route.test.ts`

- [ ] Add a streaming HTTP route for assistant replies.
- [ ] Stream structured mutation events over the HTTP response body.
- [ ] Validate stale lease rejection for message streaming.

### Task 5: Rebuild Workspace Session State Around Leases

**Files:**
- Modify: `apps/web/src/features/workspace-session/WorkspaceSessionProvider.tsx`
- Modify: `apps/web/src/features/workspace-session/store.ts`
- Modify: `apps/web/src/features/workspace-session/store.test.ts`
- Delete: `apps/web/src/features/realtime/client.ts`
- Modify: `apps/web/src/features/commands/createCommands.ts`

- [ ] Replace realtime client setup with lease acquire, renew, release, and status polling.
- [ ] Track `active`, `recovering`, and `blocked-stale` states in the workspace session store.
- [ ] Route command objects to HTTP mutation handlers instead of WebSocket sends.

### Task 6: Add Blocked-Stale Product UX

**Files:**
- Modify: `apps/web/src/features/canvas/CanvasWorkspace.tsx`
- Create: `apps/web/src/features/workspace-session/WorkspaceLeaseBlocker.tsx`
- Modify: `apps/web/src/shared/styles.css`

- [ ] Add a full-screen blocking overlay for stale workspaces.
- [ ] Disable editing interactions while stale or recovering.
- [ ] Keep stale content visually de-emphasized and explicitly marked untrusted.

### Task 7: Convert Node And Message Interactions To Local-First HTTP Flows

**Files:**
- Modify: `apps/web/src/features/canvas/CanvasView.tsx`
- Modify: `apps/web/src/features/canvas/CanvasNodeView.tsx`
- Modify: `apps/web/src/features/node-chat/MessageComposer.tsx`
- Modify: `apps/web/src/features/node-chat/MessageList.tsx`

- [ ] Preserve immediate local feedback for node operations.
- [ ] Use client-supplied IDs for optimistic create flows.
- [ ] Use streamed HTTP events for assistant replies.
- [ ] Enter blocked-stale state immediately on lease conflicts.

### Task 8: Update Tests And Remove WebSocket Assumptions

**Files:**
- Modify: `apps/web/e2e/multi-window-sync.spec.ts`
- Modify: `docs/architecture.md`
- Modify: `docs/deployment.md`
- Modify: `apps/web/src/debug/CanvasDebugPanel.dev.tsx`

- [ ] Rewrite end-to-end expectations around single-active-client takeover instead of shared live sync.
- [ ] Remove durable WebSocket architecture claims from current docs.
- [ ] Update debug output to reflect lease status rather than socket state.

### Task 9: Verify The Full Change

**Files:**
- None

- [ ] Run targeted API tests for leases and HTTP mutation routes.
- [ ] Run targeted web tests for session store and canvas behavior.
- [ ] Run relevant Playwright coverage for takeover and stale blocking.
- [ ] Run repository typecheck and lint.
