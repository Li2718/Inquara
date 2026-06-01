# WebSocket Reliability Replacement Design

> status: active
> initiative: `docs/initiatives/websocket-reliability/README.md`
> date: 2026-06-01

## Summary

Replace the current project-wide WebSocket command and synchronization path with a simpler model:

- all workspace mutations use authenticated HTTP routes
- assistant streaming uses HTTP streaming
- each workspace has exactly one active editing client at a time
- active editing is controlled by a Redis-backed lease
- inactive clients must treat their local workspace snapshot as stale and blocked

This removes the need for project-wide WebSocket keepalive, reconnect, command acknowledgement, command replay, and multi-client live merge behavior.

## Product Rules

1. Every workspace mutation must give immediate local feedback before the network round trip completes.
2. A workspace may have only one active editing client at a time.
3. A newly opened client may automatically take over the active lease for the same workspace.
4. A client that loses the lease must immediately become stale and blocked.
5. A stale client must not present its old workspace snapshot as trustworthy current state.
6. When a stale client regains the lease, it must refetch the latest workspace snapshot before editing resumes.

## Architecture

### Transport

- Remove the WebSocket command path from both web and API applications.
- Keep normal workspace snapshot loading over HTTP.
- Add explicit HTTP mutation endpoints for workspace node and message actions.
- Add a streaming HTTP endpoint for assistant replies.

### Lease Model

Each workspace has a Redis-backed lease record with:

- `workspaceId`
- `holderSessionId`
- `leaseEpoch`
- `expiresAt`

Each waiting client also has a lightweight Redis waiter record with:

- `workspaceId`
- `sessionId`
- `displacedSeq`
- `lastSeenAt`

The lease epoch increments whenever a different session takes ownership. Mutation requests must include the caller's current `sessionId` and `leaseEpoch`. The API rejects stale callers.

### Client Identity

- `sessionId` is tab or window scoped and stored in `sessionStorage`
- a refreshed page gets a new session and loses waiting priority

The design deliberately avoids durable offline replay or restoring queued writes across page reloads.

## Lifecycle

### Open Workspace

1. Client creates or reads its `sessionId`
2. Client requests `POST /workspaces/:id/lease/acquire`
3. If acquired:
   - server returns current `leaseEpoch`
   - client fetches snapshot
   - client enters active state
4. If blocked:
   - client fetches no new data beyond optional status metadata
   - client enters stale blocked state

### Active Client

- Sends `renew` every 5 seconds
- Lease TTL is 15 seconds
- Workspace mutations are optimistic locally and then persisted over HTTP
- The server validates `sessionId + leaseEpoch` on every mutation

### Takeover

1. New client calls `acquire`
2. Server replaces holder
3. Previous holder gets a waiter record with next `displacedSeq`
4. New holder receives incremented `leaseEpoch`
5. Previous holder discovers loss on next renew or on failed mutation and becomes stale blocked

### Recovery

- Stale clients poll `status` every 8-10 seconds with jitter
- When no active holder exists, the waiter with the smallest `displacedSeq` may reacquire
- After reacquire, the client refetches snapshot and only then re-enables editing

## User Experience

### Active

- Workspace behaves normally
- Mutations feel local-first

### Stale Blocked

Show a full-screen blocking overlay over the workspace:

- title: `This workspace is active in another client`
- body: `The content shown here may be out of date. Editing is disabled until this client becomes active again.`

Blocked state requirements:

- disable all editing interactions
- disable message send
- disable node creation, deletion, rename, resize, drag persistence, and branch actions
- keep the previous canvas visible only as background context

## HTTP Endpoints

### Lease

- `POST /workspaces/:workspaceId/lease/acquire`
- `POST /workspaces/:workspaceId/lease/renew`
- `POST /workspaces/:workspaceId/lease/release`
- `GET /workspaces/:workspaceId/lease/status`

### Workspace Mutations

Reuse command-shaped payloads but send them over HTTP:

- `POST /workspaces/:workspaceId/commands`

Supported mutation types:

- `node.createAtPosition`
- `node.createFromSelection`
- `node.updatePosition`
- `node.updateSize`
- `node.updateScroll`
- `node.rename`
- `node.hideSubtree`
- `node.restoreBranch`
- `node.deleteSubtree`
- `node.restoreDeletedSubtree`

### Streaming Messages

- `POST /workspaces/:workspaceId/messages/stream`

The response streams newline-delimited event envelopes for:

- optimistic user message confirmation
- assistant placeholder creation
- assistant deltas
- assistant completion or failure

## Optimistic IDs

To support immediate local-first creation without server-generated remapping, the client supplies final IDs for:

- new nodes
- new edges created from selection
- user messages
- assistant placeholder messages

The API persists these IDs directly when creating records.

## Testing

Required coverage:

- lease acquire, takeover, renew, release, expiry, and waiter priority
- rejected mutations when lease epoch is stale
- optimistic node creation and deletion over HTTP
- assistant streaming over HTTP
- stale blocking UI on lease loss
- active recovery after reacquire

## Documentation Follow-Up

When implementation lands, update current docs to remove WebSocket architecture claims and replace them with the lease-based HTTP model.
