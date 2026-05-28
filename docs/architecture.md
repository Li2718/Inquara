# Inquara Production Architecture Design

## Goal

Build the first production version of Inquara: an account-based personal AI thinking workspace where each user can create multiple infinite canvases, place chat nodes on a canvas, ask questions inside nodes, branch follow-up nodes from selected assistant text, and keep multiple browser windows for the same account synchronized in real time.

The first production version should preserve the interaction proven by the demo while replacing the demo's in-memory state and static JavaScript with a maintainable TypeScript architecture, durable storage, authenticated APIs, and a real-time event pipeline.

## Product Scope

### In Scope

- Account system for individual users.
- Multiple workspaces per user.
- One infinite canvas per workspace.
- Canvas nodes that currently behave as chat boxes.
- Creating a new node from selected assistant text.
- Creating a new node directly from an empty canvas position.
- Node dragging, resizing if needed, folding, and basic deletion.
- Edges between related nodes.
- Persistent nodes, edges, and messages.
- Real-time synchronization across multiple windows opened by the same user.
- AI streaming where all windows viewing the same workspace can see the same assistant reply stream.
- Error handling for failed commands, disconnected real-time sessions, and failed AI responses.

### Out Of Scope For The First Version

- Multi-user collaboration.
- Workspace sharing and permissions beyond ownership.
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
  Fastify service for HTTP APIs, WebSocket synchronization, and AI streaming.

packages/domain
  Shared TypeScript types, command/event schemas, and validation helpers.

packages/db
  Prisma schema and database client.

packages/config
  Shared environment parsing and runtime configuration.
```

This is preferred over a pure Next.js full-stack design because Inquara's core experience depends on long-lived WebSocket connections and AI stream fanout. Keeping those responsibilities in a dedicated Fastify service makes the real-time path easier to reason about and easier to deploy independently. Next.js can focus on routing, authenticated pages, and the user interface.

## Technology Stack

- Language: TypeScript.
- Web app: Next.js, React, React Flow, TanStack Query, Zustand or a small `useSyncExternalStore` store.
- API app: Fastify, `@fastify/websocket`, Zod or Valibot for runtime schemas.
- Database: PostgreSQL.
- ORM: Prisma.
- Authentication: Auth.js or a hosted auth provider with server-side session verification. The design only requires a stable `userId` in the API layer.
- Real-time transport: WebSocket.
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
- `User.role` distinguishes regular users from admins. The first admin can be bootstrapped from seed environment variables.
- Refresh-token style access can be added later by attaching refresh token records to a session/device family; the current web app does not need access tokens for first-party cookie auth.

### Workspace

Represents one saved canvas owned by one user. A user can own many workspaces.

### CanvasNode

Represents an object positioned on the workspace canvas. In the first version, every node behaves as a chat box, but the schema should not include unused `type`, `data`, image, artifact, or plugin fields yet.

Important fields:

- `id`
- `workspaceId`
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
- `workspaceId`
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
- `workspaceId`
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

workspaces
  id
  owner_id
  title
  version
  created_at
  updated_at
  archived_at

canvas_nodes
  id
  workspace_id
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
  workspace_id
  source_node_id
  target_node_id
  source_message_id
  label
  created_at

node_messages
  id
  workspace_id
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

- `workspaces(owner_id, updated_at)`
- `canvas_nodes(workspace_id)`
- `canvas_edges(workspace_id)`
- `node_messages(node_id, created_at)`
- `node_messages(workspace_id, created_at)`

The schema deliberately avoids a generic node `type` column and a generic `data` JSON column for the first version. If a later product iteration introduces images or other node kinds, add that through an explicit migration once the requirements are known.

## Command And Event Model

The client should not write arbitrary database-shaped objects. It should send commands to the API, and the API should validate ownership, apply the change, persist it, and broadcast a workspace event.

Example commands:

- `workspace.create`
- `workspace.rename`
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

- `workspace.snapshot.loaded`
- `workspace.version.updated`
- `workspace.node.created`
- `workspace.node.updated`
- `workspace.node.deleted`
- `workspace.edge.created`
- `workspace.edge.deleted`
- `workspace.message.created`
- `workspace.message.updated`
- `workspace.message.delta`
- `workspace.message.failed`

Each client-originated command should include a `clientMutationId`. When the server broadcasts the resulting event, the originating window can use that id to reconcile optimistic UI state without applying the same change twice.

## Real-Time Synchronization

Use the server as the authority for workspace state.

Initial load:

```text
1. Web app requests GET /workspaces/:workspaceId/snapshot.
2. API verifies the authenticated user owns the workspace.
3. API returns workspace metadata, nodes, edges, messages, and current workspace version.
4. Web app opens a WebSocket subscription for the workspace.
```

Editing flow:

```text
1. User performs an action in the canvas.
2. Web app applies a local optimistic update when the action is low risk.
3. Web app sends a command to the API.
4. API validates ownership and command shape.
5. API writes the change to Postgres.
6. API increments the workspace version.
7. API broadcasts an event to all open sockets subscribed to that workspace.
8. All windows apply the event.
```

Conflict handling:

- The first version uses last-write-wins for simple node fields such as position, title, and collapsed state.
- Each workspace has a monotonic `version`.
- If a client detects a missing or out-of-order event, it refetches the full snapshot.
- Offline editing is not supported in the first version.

This approach is enough for one user with multiple windows and avoids the complexity of CRDTs until true multi-user collaboration exists.

## AI Streaming Flow

AI requests should be initiated and streamed by the API service, not directly by the browser.

Flow:

```text
1. User submits a message in a node.
2. Web app sends `message.sendUserMessage`.
3. API creates a complete user message.
4. API creates an assistant message with `status = streaming` and empty content.
5. API broadcasts `workspace.message.created`.
6. API builds model context from the node's message history and source quote metadata.
7. API calls the configured AI provider with streaming enabled.
8. For each received chunk:
   - append chunk to an in-memory buffer
   - broadcast `workspace.message.delta`
9. When generation completes:
   - persist the full assistant message content
   - mark status as `complete`
   - broadcast `workspace.message.updated`
10. If generation fails:
   - mark the assistant message as `failed`
   - store a concise error message
   - broadcast `workspace.message.failed`
```

Streaming deltas do not need to be written to the database one token at a time. Only the final assistant content must be persisted. This keeps the database clean while still allowing every open window to watch the same reply stream.

## Frontend Architecture

The web app should be organized around product features rather than technical layers alone.

Suggested structure:

```text
apps/web/src/app
  Authentication routes and workspace pages.

apps/web/src/features/workspaces
  Workspace list, creation, renaming, and navigation.

apps/web/src/features/canvas
  React Flow canvas, node rendering, edge rendering, selection toolbar, pan/zoom behavior.

apps/web/src/features/node-chat
  Message list, composer, streaming assistant display, retry UI.

apps/web/src/features/realtime
  WebSocket client, subscription lifecycle, reconnect logic, event application.

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
- Workspace list page.
- Workspace canvas page.
- Route-level loading and error boundaries.

Does not own:

- Canvas state mutation logic.
- WebSocket event application.
- AI message sending logic.

Primary interfaces:

- Renders `WorkspaceListPage`.
- Renders `WorkspaceCanvasPage` with the route `workspaceId`.

#### `features/workspaces`

Owns workspace-level product flows.

Responsibilities:

- Fetching the user's workspace list.
- Creating a workspace.
- Renaming and archiving a workspace.
- Choosing the initial workspace after login.

Primary interfaces:

- `useWorkspaces()`
- `createWorkspace(input)`
- `renameWorkspace(input)`
- `archiveWorkspace(input)`

The module should not know how nodes, edges, or messages are rendered inside a workspace.

#### `features/workspace-session`

Owns the lifecycle of one opened workspace.

Responsibilities:

- Loading the initial workspace snapshot.
- Creating the in-memory workspace store from the snapshot.
- Opening the WebSocket subscription after snapshot load.
- Reconnecting and refetching the snapshot when event gaps are detected.
- Exposing the live workspace state to canvas and chat modules.

Primary interfaces:

- `WorkspaceSessionProvider`
- `useWorkspaceSession()`
- `useWorkspaceState(selector)`
- `dispatchWorkspaceCommand(command)`

This module is the bridge between HTTP snapshot loading, WebSocket events, and UI state.

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

#### `features/realtime`

Owns the browser WebSocket client.

Responsibilities:

- Connecting to the API WebSocket endpoint.
- Authenticating the socket using the current session.
- Subscribing to one workspace.
- Receiving, validating, and ordering events.
- Reconnecting with backoff.
- Reporting event gaps to `workspace-session`.

Primary interfaces:

- `createRealtimeClient(config)`
- `subscribeToWorkspace(workspaceId, handlers)`
- `sendCommand(command)`

This module should not mutate React state directly. It passes events to `workspace-session`.

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
- A small workspace store holds the live canvas state after snapshot load.
- The WebSocket client applies server events to the workspace store.
- React Flow renders controlled nodes and edges from the workspace store.

The canvas node component should include a message list and composer, but the logic for sending messages should stay in the node-chat feature so it can be tested separately from React Flow.

### Frontend Data Flow

Opening a workspace:

```text
Workspace route
  -> WorkspaceSessionProvider
  -> GET workspace snapshot
  -> initialize workspace store
  -> open WebSocket subscription
  -> render CanvasView
```

Dragging a node:

```text
React Flow node drag
  -> canvas module creates node.updatePosition command
  -> workspace-session applies optimistic position update
  -> realtime client sends command
  -> API persists and broadcasts workspace.node.updated
  -> workspace-session reconciles optimistic state with server event
```

Sending a message:

```text
MessageComposer submit
  -> node-chat creates message.sendUserMessage command
  -> realtime client sends command
  -> API creates user and assistant messages
  -> workspace-session receives message events and deltas
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
  -> all windows receive node and edge events
```

## Backend Architecture

Suggested structure:

```text
apps/api/src/http
  Fastify route registration and request handlers.

apps/api/src/auth
  Session verification and current-user extraction.

apps/api/src/workspaces
  Workspace queries, snapshot endpoint, workspace commands.

apps/api/src/canvas
  Node and edge commands.

apps/api/src/messages
  User message creation, assistant retry, message persistence.

apps/api/src/realtime
  WebSocket server, workspace subscriptions, event broadcasting.

apps/api/src/ai
  Provider abstraction, context building, stream handling.
```

Backend rules:

- Every workspace command must verify `workspace.ownerId === currentUser.id`.
- All writes go through command handlers, not direct route-level database mutations.
- Command handlers return the persisted result and the event or events to broadcast.
- The AI gateway is the only code allowed to call external model providers.
- API routes should never expose provider API keys to the browser.

### Backend Module Responsibilities

#### `http`

Owns Fastify server setup.

Responsibilities:

- Registering plugins.
- Registering HTTP routes.
- Registering the WebSocket endpoint.
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
- Providing authorization helpers such as `requireWorkspaceOwner(userId, workspaceId)`.

The rest of the backend should depend on this module for identity checks instead of parsing auth details directly. WebSocket handlers must attach message listeners synchronously and await session verification inside message handling so the first client message cannot be lost while authentication is still loading.

#### `workspaces`

Owns workspace queries and workspace-level commands.

Responsibilities:

- Listing workspaces for a user.
- Creating a workspace with an initial root node when appropriate.
- Renaming and archiving a workspace.
- Loading a full workspace snapshot.
- Incrementing the workspace version inside write transactions.

Primary services:

- `listWorkspaces(userId)`
- `createWorkspace(userId, input)`
- `renameWorkspace(userId, input)`
- `archiveWorkspace(userId, input)`
- `getWorkspaceSnapshot(userId, workspaceId)`

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

#### `realtime`

Owns WebSocket sessions and workspace event fanout.

Responsibilities:

- Authenticating socket connections.
- Tracking which sockets are subscribed to each workspace.
- Validating incoming command envelopes.
- Dispatching commands to the correct backend service.
- Broadcasting events to subscribed sockets.
- Sending reconnect or resync instructions when needed.

Primary interfaces:

- `subscribe(socket, workspaceId)`
- `broadcastWorkspaceEvent(workspaceId, event)`
- `handleCommandEnvelope(socket, envelope)`

This module should not contain database write logic. It dispatches commands and broadcasts the resulting events.

#### `events`

Owns event schemas and event construction.

Responsibilities:

- Defining event payload shapes.
- Creating versioned workspace events.
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
WebSocket command envelope
  -> realtime.handleCommandEnvelope
  -> auth.requireWorkspaceOwner
  -> canvas.createNodeFromSelection
  -> database transaction:
       validate source node and source message
       create child canvas node
       create canvas edge
       increment workspace version
  -> events.createNodeCreatedEvent
  -> events.createEdgeCreatedEvent
  -> realtime.broadcastWorkspaceEvent
```

Example: send a message and stream an assistant reply.

```text
WebSocket command envelope
  -> realtime.handleCommandEnvelope
  -> messages.sendUserMessage
  -> database transaction:
       create user message
       create assistant placeholder
       increment workspace version
  -> broadcast message.created events
  -> ai.streamAssistantReply
  -> for each chunk:
       broadcast message.delta
  -> messages.completeAssistantMessage
  -> broadcast message.updated
```

## Error Handling

Client behavior:

- Show reconnect status when WebSocket disconnects.
- Refetch snapshot after reconnect if events may have been missed.
- Roll back optimistic updates when a command fails.
- Show failed assistant messages inline with a retry action.
- Keep the user's submitted message even when the assistant response fails.

Server behavior:

- Return typed validation errors for malformed commands.
- Return authorization errors when the user does not own a workspace.
- Store concise AI error messages on failed assistant messages.
- Log provider errors with request ids, but do not expose secrets or raw provider payloads to the client.

## Testing Strategy

Detailed test quality rules live in `docs/testing-standards.md`. The architecture document keeps only the durable testing boundaries that affect system safety.

Use tests at the boundaries where mistakes are most likely:

- Domain tests for command validation and event reducers.
- Database integration tests for workspace ownership, node creation, branch creation, and message persistence.
- API tests for snapshot loading and command endpoints.
- WebSocket tests for subscribing to a workspace and receiving broadcast events.
- AI gateway tests with a fake streaming provider.
- Frontend component tests for node composer, message streaming display, and selection follow-up creation.
- A Playwright smoke test for logging in, creating a workspace, asking a question, branching from selected text, and seeing updates in a second browser context.

Database-backed tests must be isolated from local development data.

- API, database integration, WebSocket, and Playwright e2e tests that write to the database must run against a temporary PostgreSQL database started with `testcontainers`.
- Test setup must apply the real Prisma migrations to the temporary database before the test suite writes data.
- Tests must not default to the local development `DATABASE_URL` from `.env` when they perform destructive cleanup.
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
