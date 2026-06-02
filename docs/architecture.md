# Inquara Production Architecture Design

## Goal

Build the first production version of Inquara: an account-based personal AI thinking canvas where each user can create multiple infinite canvases, place chat nodes on a canvas, ask questions inside nodes, branch follow-up nodes from selected assistant text, and edit one canvas at a time through a single-active-client lease model.

The first production version should preserve the interaction proven by the demo while replacing the demo's in-memory state and static JavaScript with a maintainable TypeScript architecture, durable storage, authenticated APIs, and a real-time event pipeline.

## Product Scope

### In Scope

- Account system for individual users.
- Multiple canvases per user.
- One infinite canvas view per canvas.
- Canvas nodes that currently behave as chat boxes.
- Creating a new node from selected assistant text.
- Creating a new node directly from an empty canvas position.
- Node dragging, resizing if needed, folding, and basic deletion.
- Edges between related nodes.
- Persistent nodes, edges, and messages.
- Local-first canvas editing with a single active editing client per canvas.
- AI streaming over HTTP for the active canvas client.
- Error handling for failed commands, disconnected real-time sessions, and failed AI responses.

### Out Of Scope For The First Version

- Multi-user collaboration.
- Canvas sharing and permissions beyond ownership.
- Offline editing and conflict merging.
- Complex CRDT-based document synchronization.
- Node types other than the current chat node behavior.
- Plugin architecture for arbitrary node renderers.
- Full-text semantic search, vector memory, or RAG pipelines.
- Billing.

## Architecture Choice

Use a TypeScript monorepo with separate web and API applications:

```text
apps/web
  Next.js application for authenticated product UI and canvas experience.

apps/api
  Fastify service for HTTP APIs, canvas lease enforcement, command mutation routes, and AI streaming.

packages/domain
  Shared TypeScript types, command/event schemas, and validation helpers.

packages/db
  Prisma schema and database client.

packages/config
  Shared environment parsing and runtime configuration.
```

This is preferred over a pure Next.js full-stack design because Inquara's core experience depends on authenticated canvas mutation routes, lease enforcement, and AI stream handling. Keeping those responsibilities in a dedicated Fastify service makes the mutation and streaming path easier to reason about and easier to deploy independently. Next.js can focus on routing, authenticated pages, and the user interface.

## Technology Stack

- Language: TypeScript.
- Web app: Next.js, React, React Flow, TanStack Query, Zustand or a small `useSyncExternalStore` store.
- API app: Fastify, Redis-backed canvas leases, and Zod or Valibot for runtime schemas.
- Database: PostgreSQL.
- ORM: Prisma.
- Authentication: Auth.js or a hosted auth provider with server-side session verification. The design only requires a stable `userId` in the API layer.
- Canvas mutation transport: authenticated HTTP routes.
- AI provider integration: server-side AI gateway using an OpenAI-compatible streaming interface where practical.

## Debug System Rules

Debug information must never be presented as normal product UI. Development diagnostics belong behind the global debug system.

Hard rules:

- Web debug UI must be mounted once from the global app layout through `apps/web/src/debug/DebugRoot.tsx`.
- Product pages may publish page-specific debug data only through product-safe debug source entrypoints such as `apps/web/src/debug/DebugCanvasSource.tsx`; they must not render debug UI directly.
- Development-only debug UI modules must use `.dev.tsx` or `.dev.ts` filenames.
- Product feature modules outside `apps/web/src/debug/` must not import `.dev` debug modules directly.
- Debug UI must be visually incompatible with the product surface and include a clear debug marker, while remaining usable enough for daily development.
- Any API route intended for debugging must live under `/debug/*`.
- Debug API routes must not be registered when `NODE_ENV` is `production`.
- Debug code must not expose secrets, raw cookies, API keys, database URLs, or full environment objects.
- Production web builds must pass `npm run verify:debug-free`, which scans build artifacts for debug markers.

The first debug surface is the canvas debug panel. It owns session diagnostics such as connection status, node counts, edge counts, message counts, pending mutation counts, and the first visible root node.

## Domain Model

The first version only implements chat behavior, but the canvas layer should avoid being named as if every node will always be a chat node. Extensibility should come from clean boundaries and neutral naming, not from unused database fields or speculative node types.

### User

Represents an authenticated individual account.

Users may have a password identity now and OAuth identities later. The API uses server-side sessions rather than signed user-id cookies so sessions can be remembered, listed by device, revoked individually, or revoked all at once.

Related account concepts:

- `UserIdentity` records a login provider such as `password`, and later `google` or `github`.
- `UserSession` records one browser/device session with a hashed opaque token, `rememberMe`, device metadata, expiry, and revocation state.
- `User.role` distinguishes regular users from admins. Initial account creation belongs to the dedicated setup flow.
- Refresh-token style access can be added later by attaching refresh token records to a session/device family; the current web app does not need access tokens for first-party cookie auth.

### Setup

Self-managed deployments initialize through a startup-selected setup app.

The deployed web entrypoint checks whether setup is complete. Fresh deployments start the setup app; initialized deployments start the normal Next.js web app. The setup app completes initialization directly through the database-backed setup service, then exits so the process supervisor can restart the web runtime into normal mode.

The first setup step stores the initial account as a normal password user with `role = "admin"` and a password identity. The setup service serializes concurrent setup attempts and re-checks inside the transaction that setup is still incomplete before inserting the account.

Ordinary registration, redemption-code gating, and admin management pages are separate from setup.

### SystemSetting

Stores product-wide switches and small structured settings that should not become environment-only behavior.

Settings are deliberately generic at the database layer, but not at the service boundary. Each setting must have a typed accessor that owns its key, default value, and value parsing. Feature code should call the typed accessor instead of reading arbitrary `SystemSetting` rows directly.

The first setting is `registration.invitationOnly`. When the row does not exist, local development and test default to open registration, while production defaults to invitation-only registration.

### RedemptionCode

Represents a code that can be redeemed for a structured target.

The product may call registration-eligibility codes "invitation codes" in user-facing copy, but code, database, API, service, and tests should use redemption-code naming. The first supported target is `registration_eligibility`; future targets may represent privileges, balance, referral attribution, or other benefits.

Important fields:

- `code`: normalized unique plaintext code. Admin UI may display this value.
- `target`: the redeemable target, initially `registration_eligibility`.
- `source`: where the code came from, initially administrator generation.
- `createdById`: the administrator or future issuer user when applicable.
- `note`
- `maxRedemptions`
- `expiresAt`
- `disabledAt`

`RedemptionCodeRedemption` stores each redemption separately from the code so multi-use codes and future reward histories do not overload a single `usedByUserId` field. Registration must validate and record the redemption in the same transaction that creates or attaches the user password identity.

### Canvas

Represents one saved canvas owned by one user. A user can own many canvases.

### CanvasNode

Represents an object positioned on the canvas. In the first version, every node behaves as a chat box, but the schema should not include unused `type`, `data`, image, artifact, or plugin fields yet.

Important fields:

- `id`
- `canvasId`
- `title`
- `x`
- `y`
- `width`
- `height`
- `collapsed`
- `parentNodeId`
- `sourceNodeId`
- `sourceMessageId`
- `sourceQuote`
- `sourceRangeStart`
- `sourceRangeEnd`
- `createdAt`
- `updatedAt`

### NodeMessage

Represents a message inside a canvas node.

Important fields:

- `id`
- `canvasId`
- `nodeId`
- `role`: `user`, `assistant`, or `system`
- `content`
- `status`: `complete`, `streaming`, or `failed`
- `model`
- `errorMessage`
- `createdAt`
- `updatedAt`

### CanvasEdge

Represents a relationship between two canvas nodes. A follow-up from selected assistant text creates an edge from the source node to the new node.

Important fields:

- `id`
- `canvasId`
- `sourceNodeId`
- `targetNodeId`
- `sourceMessageId`
- `label`
- `createdAt`

The selected text source should be stored on the child node as `sourceMessageId`, `sourceQuote`, `sourceRangeStart`, and `sourceRangeEnd`. This keeps the first schema simple while preserving where a branch came from.

## Database Design

Initial tables:

```text
users
  id
  email
  name
  avatar_url
  role
  password_hash
  created_at
  updated_at

user_identities
  id
  user_id
  provider
  provider_user_id
  email
  created_at
  updated_at

user_sessions
  id
  user_id
  token_hash
  remember_me
  user_agent
  ip_address
  last_seen_at
  expires_at
  revoked_at
  created_at
  updated_at

system_settings
  key
  value
  created_at
  updated_at

redemption_codes
  id
  code
  target
  source
  note
  max_redemptions
  expires_at
  disabled_at
  created_by_id
  created_at
  updated_at

redemption_code_redemptions
  id
  redemption_code_id
  user_id
  target
  action
  created_at

canvases
  id
  owner_id
  title
  version
  created_at
  updated_at
  archived_at

canvas_nodes
  id
  canvas_id
  title
  x
  y
  width
  height
  collapsed
  parent_node_id
  source_node_id
  source_message_id
  source_quote
  source_range_start
  source_range_end
  version
  created_at
  updated_at

canvas_edges
  id
  canvas_id
  source_node_id
  target_node_id
  source_message_id
  label
  created_at

node_messages
  id
  canvas_id
  node_id
  role
  content
  status
  model
  error_message
  created_at
  updated_at
```

Indexes:

- `canvases(owner_id, updated_at)`
- `redemption_codes(code)` unique
- `redemption_codes(target, disabled_at, expires_at)`
- `redemption_code_redemptions(redemption_code_id, user_id, target)` unique
- `canvas_nodes(canvas_id)`
- `canvas_edges(canvas_id)`
- `node_messages(node_id, created_at)`
- `node_messages(canvas_id, created_at)`

The schema deliberately avoids a generic node `type` column and a generic `data` JSON column for the first version. If a later product iteration introduces images or other node kinds, add that through an explicit migration once the requirements are known.

## Command And Event Model

The client should not write arbitrary database-shaped objects. It should send commands to the API, and the API should validate ownership, apply the change, persist it, and broadcast a canvas event.

Example commands:

- `canvas.create`
- `canvas.rename`
- `node.createAtPosition`
- `node.createFromSelection`
- `node.updatePosition`
- `node.updateSize`
- `node.updateTitle`
- `node.toggleCollapsed`
- `node.delete`
- `message.sendUserMessage`
- `message.retryAssistant`

Example events:

- `canvas.snapshot.loaded`
- `canvas.version.updated`
- `canvas.node.created`
- `canvas.node.updated`
- `canvas.node.deleted`
- `canvas.edge.created`
- `canvas.edge.deleted`
- `canvas.message.created`
- `canvas.message.updated`
- `canvas.message.delta`
- `canvas.message.failed`

Each client-originated command should include a `clientMutationId`. When the server broadcasts the resulting event, the originating window can use that id to reconcile optimistic UI state without applying the same change twice.

## Canvas Session Model

Use the server as the authority for canvas state.

Initial load:

```text
1. Web app requests GET /canvases/:canvasId/snapshot.
2. API verifies the authenticated user owns the canvas.
3. Web app acquires a canvas lease for a tab-scoped session id.
4. If acquired, API returns the current lease epoch.
5. Web app loads canvas metadata, nodes, edges, messages, and current canvas version.
```

Editing flow:

```text
1. User performs an action in the canvas.
2. Web app applies a local optimistic update when the action is low risk.
3. Web app sends a lease-aware HTTP command to the API.
4. API validates ownership, lease epoch, and command shape.
5. API writes the change to Postgres.
6. API increments the canvas version.
7. API returns the resulting canvas events, or streams them for assistant replies.
8. The active client reconciles optimistic state with the returned events.
```

Conflict handling:

- Each canvas has exactly one active editing client at a time.
- A newer client may take over the lease immediately.
- A displaced client becomes stale and blocked until it can reacquire and refetch the snapshot.
- Each canvas has a monotonic `version`.
- Offline editing is not supported in the first version.

This approach is enough for one user moving between windows, tabs, or devices and avoids the complexity of live multi-client merge behavior until true multi-user collaboration exists.

## AI Streaming Flow

AI requests should be initiated and streamed by the API service, not directly by the browser.

Flow:

```text
1. User submits a message in a node.
2. Web app sends `message.sendUserMessage` to the HTTP streaming route together with the current lease epoch.
3. API creates a complete user message.
4. API creates an assistant message with `status = streaming` and empty content.
5. API streams `canvas.message.created`.
6. API builds model context from the node's message history and source quote metadata.
7. API calls the configured AI provider with streaming enabled.
8. For each received chunk:
   - append chunk to an in-memory buffer
   - stream `canvas.message.delta`
9. When generation completes:
   - persist the full assistant message content
   - mark status as `complete`
   - broadcast `canvas.message.updated`
10. If generation fails:
   - mark the assistant message as `failed`
   - store a concise error message
   - broadcast `canvas.message.failed`
```

Streaming deltas do not need to be written to the database one token at a time. Only the final assistant content must be persisted. This keeps the database clean while still allowing every open window to watch the same reply stream.

## Frontend Architecture

The web app should be organized around product features rather than technical layers alone.

Suggested structure:

```text
apps/web/src/app
  Authentication routes and canvas pages.

apps/web/src/features/canvases
  Canvas list, creation, renaming, and navigation.

apps/web/src/features/canvas
  React Flow canvas, node rendering, edge rendering, selection toolbar, pan/zoom behavior.

apps/web/src/features/node-chat
  Message list, composer, streaming assistant display, retry UI.

apps/web/src/features/canvas-session
  Canvas lease lifecycle, optimistic HTTP mutation flow, stale-blocking recovery, and streamed assistant handling.

apps/web/src/shared
  UI primitives, hooks, formatting, utilities.
```

UI implementation and component placement must follow `docs/ui-system.md`. Shared reusable UI belongs under `apps/web/src/shared/components/`, with generic primitives and interactions in `shared/components/ui/`.

### Frontend Module Responsibilities

#### `app`

Owns Next.js routing and page composition.

Responsibilities:

- Public login/register routes.
- Authenticated shell layout.
- Canvas list page.
- Canvas page.
- Route-level loading and error boundaries.

Does not own:

- Canvas state mutation logic.
- Canvas event application and optimistic mutation reconciliation.
- AI message sending logic.

Primary interfaces:

- Renders `CanvasListPage`.
- Renders `CanvasSurfacePage` with the route `canvasId`.

#### `features/canvases`

Owns canvas-level product flows.

Responsibilities:

- Fetching the user's canvas list.
- Creating a canvas.
- Renaming and archiving a canvas.
- Choosing the initial canvas after login.

Primary interfaces:

- `useCanvases()`
- `createCanvas(input)`
- `renameCanvas(input)`
- `archiveCanvas(input)`

The module should not know how nodes, edges, or messages are rendered inside a canvas.

#### `features/canvas-session`

Owns the lifecycle of one opened canvas.

Responsibilities:

- Loading the initial canvas snapshot.
- Creating the in-memory canvas store from the snapshot.
- Acquiring the canvas lease before enabling editing.
- Polling for recovery and refetching the snapshot after stale takeover or network recovery.
- Exposing the live canvas state to canvas and chat modules.

Primary interfaces:

- `CanvasSessionProvider`
- `useCanvasSession()`
- `useCanvasState(selector)`
- `dispatchCanvasCommand(command)`

This module is the bridge between snapshot loading, lease state, HTTP mutation flows, streaming replies, and UI state.

#### `features/canvas`

Owns the infinite canvas experience.

Responsibilities:

- React Flow setup.
- Rendering controlled nodes and edges.
- Pan and zoom behavior.
- Node dragging and position updates.
- Node selection and toolbar positioning.
- Empty-canvas node creation.
- Selection-based branch creation entry point.

Primary interfaces:

- `CanvasView`
- `CanvasNodeView`
- `CanvasEdgeView`
- `SelectionFollowupToolbar`
- `useCanvasCommands()`

This module may render a node shell, but it should delegate the message list and composer to `features/node-chat`.

#### `features/node-chat`

Owns chat behavior inside a canvas node.

Responsibilities:

- Rendering node messages.
- Rendering the message composer.
- Submitting user messages.
- Displaying streaming assistant messages.
- Displaying failed assistant messages and retry actions.
- Capturing selected assistant text and producing a normalized selection payload.

Primary interfaces:

- `NodeChatPanel`
- `MessageList`
- `MessageComposer`
- `useSendNodeMessage(nodeId)`
- `useRetryAssistantMessage(messageId)`
- `getMessageSelection(range)`

This module should not know about React Flow internals. It reports branchable selections to the canvas module through callbacks.

#### `features/canvas-session`

Owns the browser canvas lease client and mutation session state.

Responsibilities:

- Acquiring, renewing, and releasing canvas leases.
- Polling for recovery when the client becomes stale.
- Sending canvas commands over HTTP.
- Streaming assistant replies over HTTP.
- Reporting `active`, `recovering`, and `blocked-stale` state changes to the rest of the product.

#### `features/commands`

Owns client command construction and optimistic update metadata.

Responsibilities:

- Creating typed commands with `clientMutationId`.
- Keeping command payloads stable across UI components.
- Deciding which commands are safe to apply optimistically.

Primary interfaces:

- `createNodeAtPositionCommand(input)`
- `createNodeFromSelectionCommand(input)`
- `updateNodePositionCommand(input)`
- `sendUserMessageCommand(input)`

#### `shared`

Owns reusable UI and utility code that has no product ownership.

Responsibilities:

- Buttons, menus, dialogs, loading states, and empty states.
- Generic hooks.
- Date and text formatting.
- Non-domain utilities.

Shared code should not import feature modules.

State responsibilities:

- TanStack Query handles initial snapshots and HTTP mutations.
- A small canvas store holds the live canvas state after snapshot load.
- The canvas session feature applies optimistic changes and server events to that store.
- React Flow renders controlled nodes and edges from the canvas store.

The canvas node component should include a message list and composer, but the logic for sending messages should stay in the node-chat feature so it can be tested separately from React Flow.

### Frontend Data Flow

Opening a canvas:

```text
Canvas route
  -> CanvasSessionProvider
  -> GET canvas snapshot
  -> initialize canvas store
  -> acquire canvas lease
  -> render CanvasView
```

Dragging a node:

```text
React Flow node drag
  -> canvas module creates node.updatePosition command
  -> canvas-session applies optimistic position update
  -> session client sends HTTP command
  -> API persists and returns canvas.node.updated
  -> canvas-session reconciles optimistic state with server event
```

Sending a message:

```text
MessageComposer submit
  -> node-chat creates message.sendUserMessage command
  -> session client sends HTTP streaming request
  -> API creates user and assistant messages
  -> canvas-session receives streamed message events and deltas
  -> NodeChatPanel renders the stream
```

Creating a branch from selected text:

```text
MessageList selection
  -> node-chat normalizes message id, range, and quote
  -> canvas shows SelectionFollowupToolbar
  -> user confirms follow-up
  -> canvas creates node.createFromSelection command
  -> API creates child node and edge
  -> active client receives node and edge events
```

## Backend Architecture

Suggested structure:

```text
apps/api/src/http
  Fastify route registration and request handlers.

apps/api/src/auth
  Session verification and current-user extraction.

apps/api/src/canvases
  Canvas queries, snapshot endpoint, canvas commands.

apps/api/src/canvas
  Node and edge commands.

apps/api/src/messages
  User message creation, assistant retry, message persistence.

apps/api/src/leases
  Canvas lease acquisition, renewal, release, and recovery priority logic.

apps/api/src/ai
  Provider abstraction, context building, stream handling.
```

Backend rules:

- Every canvas command must verify `canvas.ownerId === currentUser.id`.
- All writes go through command handlers, not direct route-level database mutations.
- Command handlers return the persisted result and the event or events to return or stream.
- The AI gateway is the only code allowed to call external model providers.
- API routes should never expose provider API keys to the browser.

### Backend Module Responsibilities

#### `http`

Owns Fastify server setup.

Responsibilities:

- Registering plugins.
- Registering HTTP routes.
- Registering canvas lease, mutation, and streaming routes.
- Attaching request ids and logging.
- Converting thrown domain errors into HTTP responses.

Does not own business logic. Route handlers should call command/query services.

#### `auth`

Owns user identity in the API service.

Responsibilities:

- Hashing and verifying passwords.
- Creating and verifying opaque server-side session tokens.
- Listing and revoking active user sessions.
- Tracking identity providers in a way that can accept OAuth providers later.
- Loading the current user.
- Exposing `requireUser(request)`.
- Providing authorization helpers such as `requireCanvasOwner(userId, canvasId)`.

The rest of the backend should depend on this module for identity checks instead of parsing auth details directly.

#### `canvases`

Owns canvas queries and canvas-level commands.

Responsibilities:

- Listing canvases for a user.
- Creating a canvas with an initial root node when appropriate.
- Renaming and archiving a canvas.
- Loading a full canvas snapshot.
- Incrementing the canvas version inside write transactions.

Primary services:

- `listCanvases(userId)`
- `createCanvas(userId, input)`
- `renameCanvas(userId, input)`
- `archiveCanvas(userId, input)`
- `getCanvasSnapshot(userId, canvasId)`

#### `canvas`

Owns node and edge mutations.

Responsibilities:

- Creating a node at a canvas position.
- Creating a follow-up node from a source message selection.
- Updating node position, size, title, and collapsed state.
- Deleting a node and its related edges according to the first-version deletion policy.
- Creating edge records when a branch is created.

Primary services:

- `createNodeAtPosition(userId, command)`
- `createNodeFromSelection(userId, command)`
- `updateNodePosition(userId, command)`
- `updateNodeLayout(userId, command)`
- `deleteNode(userId, command)`

This module should not call AI providers. It only changes canvas structure.

#### `messages`

Owns persisted node messages and message commands.

Responsibilities:

- Creating user messages.
- Creating assistant placeholder messages.
- Updating assistant messages after streaming completes.
- Marking assistant messages as failed.
- Retrying failed assistant messages.
- Selecting the message history that should be sent to the AI module.

Primary services:

- `sendUserMessage(userId, command)`
- `createAssistantPlaceholder(transaction, input)`
- `completeAssistantMessage(messageId, content)`
- `failAssistantMessage(messageId, error)`
- `retryAssistantMessage(userId, command)`

This module coordinates with `ai` for generation, but it should keep persistence rules local.

#### `ai`

Owns model-provider interaction.

Responsibilities:

- Building provider-ready message context from a node's message history and source quote.
- Calling the configured model provider.
- Normalizing streaming chunks.
- Reporting usage metadata when available.
- Mapping provider errors into safe application errors.

Primary interfaces:

- `buildNodeChatContext(input)`
- `streamAssistantReply(context, handlers)`

This module should expose a provider-neutral stream interface so the app can change model providers later without touching canvas or message command code.

#### `leases`

Owns canvas lease coordination and active-session enforcement.

Responsibilities:

- Acquiring, renewing, and releasing one active editing lease per canvas.
- Recording waiter priority after takeover.
- Determining when a blocked client may recover.
- Rejecting stale writers through lease epoch validation.

#### `events`

Owns event schemas and event construction.

Responsibilities:

- Defining event payload shapes.
- Creating versioned canvas events.
- Validating outbound events in tests.
- Keeping event names stable.

Primary interfaces:

- `createNodeCreatedEvent(input)`
- `createNodeUpdatedEvent(input)`
- `createMessageDeltaEvent(input)`
- `createMessageFailedEvent(input)`

Events are part of the product contract between API and web. They should live in shared domain code when possible.

#### `db`

Owns Prisma access patterns.

Responsibilities:

- Exporting the Prisma client.
- Providing transaction helpers.
- Keeping low-level query helpers that are shared across modules.

Business rules should stay in feature services, not in generic database helpers.

### Backend Command Flow

Example: create a follow-up from selected assistant text.

```text
HTTP command envelope
  -> lease validation
  -> auth.requireCanvasOwner
  -> canvas.createNodeFromSelection
  -> database transaction:
       validate source node and source message
       create child canvas node
       create canvas edge
       increment canvas version
  -> events.createNodeCreatedEvent
  -> events.createEdgeCreatedEvent
  -> HTTP response returns canvas events
```

Example: send a message and stream an assistant reply.

```text
HTTP command envelope
  -> lease validation
  -> messages.sendUserMessage
  -> database transaction:
       create user message
       create assistant placeholder
       increment canvas version
  -> stream message.created events
  -> ai.streamAssistantReply
  -> for each chunk:
       stream message.delta
  -> messages.completeAssistantMessage
  -> stream message.updated
```

## Error Handling

Client behavior:

- Show blocked or recovering state when lease ownership is lost or when network recovery is in progress.
- Refetch the snapshot after stale recovery before editing resumes.
- Roll back optimistic updates when a command fails.
- Show failed assistant messages inline with a retry action.
- Keep the user's submitted message even when the assistant response fails.

Server behavior:

- Return typed validation errors for malformed commands.
- Return authorization errors when the user does not own a canvas.
- Store concise AI error messages on failed assistant messages.
- Log provider errors with request ids, but do not expose secrets or raw provider payloads to the client.

## Testing Strategy

Detailed test quality rules live in `docs/testing-standards.md`. The architecture document keeps only the durable testing boundaries that affect system safety.

Use tests at the boundaries where mistakes are most likely:

- Domain tests for command validation and event reducers.
- Database integration tests for canvas ownership, node creation, branch creation, and message persistence.
- API tests for snapshot loading and command endpoints.
- Lease and HTTP route tests for takeover, stale rejection, and streamed replies.
- AI gateway tests with a fake streaming provider.
- Frontend component tests for node composer, message streaming display, and selection follow-up creation.
- A Playwright smoke test for logging in, creating a canvas, asking a question, branching from selected text, and verifying takeover or stale blocking across two browser contexts.

Database-backed tests must be isolated from local development data.

- API, database integration, lease/streaming route, and Playwright e2e tests that write to the database must run against a temporary PostgreSQL database started with `testcontainers`.
- Test setup must apply the real Prisma migrations to the temporary database before the test suite writes data.
- Tests must not default to the local development database URL from `.env.dev` or any developer-local env file when they perform destructive cleanup.
- Destructive cleanup such as `deleteMany()` belongs behind the shared ephemeral test database helper, not inside individual test files.
- Playwright e2e tests must be launched through the repository e2e wrapper so the API server, web server, and test process share the same temporary database.
- If Docker or `testcontainers` is unavailable, the test run should fail clearly. Do not silently fall back to the development database or a simplified schema-only workaround.

## Development Database Migration Rule

When implementation work modifies the Prisma schema or adds/changes a database migration, the local development database must be kept in sync with the running app.

- Before handing the app back to the user, check whether a local development server is running.
- If a local development server is running, apply the development database migration before the user continues using the browser app.
- Do not leave a running development server connected to a database that lacks the new schema shape.
- If the migration cannot be applied, report the blocker clearly instead of letting stale database errors surface through the product UI.

## Migration From The Demo

The demo should be treated as interaction reference material, not production foundation.

Keep these ideas:

- Canvas with draggable chat nodes.
- Branching from selected assistant text.
- Highlighting source text for follow-up branches.
- Mock AI mode for local development.
- Streaming response handling.

Replace these demo choices:

- In-memory graph state becomes persisted Postgres state.
- Vanilla DOM rendering becomes React and React Flow.
- Browser-owned AI calls become API-owned AI gateway calls.
- Static config file becomes server-side environment configuration.
- Local-only updates become command/event synchronization.

## Open Decisions For Implementation Planning

- Choose the exact authentication provider.
- Choose deployment target for `apps/web`, `apps/api`, and Postgres.
- Decide whether to use tRPC or typed REST between web and API.
- Decide the first AI provider configuration format.
- Decide whether resizing nodes is required in the first implementation slice.

These decisions do not block the architecture. They should be resolved before writing the implementation plan.
