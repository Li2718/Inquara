# Production MVP

> status: active
> purpose: Plan and execute the first production version of Inquara.

## Goal

Build the first production MVP: account login, multiple workspaces, persistent chat canvas nodes, selection-based branching, multi-window real-time sync, and server-broadcast AI streaming.

## Boundary

### Included

- TypeScript monorepo scaffold.
- Account login for individual users.
- Multiple workspaces per user.
- Persistent canvas nodes, edges, and node messages.
- Selection-based branch creation.
- Multi-window real-time synchronization.
- Server-broadcast AI streaming.
- Fake AI provider first, then OpenAI-compatible provider behind the same interface.

### Not Included

- Multi-user collaboration.
- Offline editing.
- Non-chat node kinds.
- Billing.
- Semantic search or RAG.

## Current Status

The production architecture is defined in [docs/architecture.md](../../architecture.md). Task 1 completed the root monorepo scaffold.

## Next Step

- Execute Task 2: Shared Domain Contracts.

## Related Documents

- [Architecture](../../architecture.md)
- [Documentation Standards](../../documentation-standards.md)

## Archive Criteria

- The MVP is implemented and verified.
- Durable architecture changes discovered during implementation are written back to [docs/architecture.md](../../architecture.md).
- Follow-up work is split into new initiatives or current docs.

## Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Architecture:** Use a TypeScript npm-workspaces monorepo with `apps/web` for the Next.js UI, `apps/api` for Fastify HTTP/WebSocket/AI streaming, and shared `packages/domain`, `packages/db`, and `packages/config`. The API is the authority for workspace state; clients load a snapshot, send typed commands, and apply versioned workspace events.

**Tech Stack:** TypeScript, npm workspaces, Next.js, React Flow, TanStack Query, Zustand, Fastify, `@fastify/websocket`, Prisma, PostgreSQL, Zod, Vitest, Playwright.

---

## Implementation Defaults

- Package manager: `npm` with workspaces.
- API style: typed REST for snapshots and workspace list, WebSocket command envelopes for live workspace mutations.
- Auth for MVP: email-only session login implemented in `apps/api`; the API sets an HTTP-only session cookie. This creates real user records and can later be replaced by Auth.js or hosted auth without changing workspace ownership rules.
- AI provider for first passing slice: fake streaming provider. Add OpenAI-compatible provider behind the same `AIProvider` interface after the fake stream is working.
- Node type scope: only chat behavior exists. Use `CanvasNode` and `NodeMessage` naming, but do not add database `type`, generic `data`, image, artifact, or plugin fields.
- Database: local PostgreSQL via Docker Compose for development.
- First UI style: product workspace UI, not a landing page.

## File Structure

Create or modify these files:

```text
package.json
tsconfig.base.json
vitest.config.ts
docker-compose.yml
.env.example

packages/domain/package.json
packages/domain/src/index.ts
packages/domain/src/schemas.ts
packages/domain/src/events.ts
packages/domain/src/commands.ts
packages/domain/src/reducer.ts
packages/domain/src/reducer.test.ts

packages/config/package.json
packages/config/src/index.ts

packages/db/package.json
packages/db/prisma/schema.prisma
packages/db/src/client.ts
packages/db/src/seed.ts

apps/api/package.json
apps/api/src/server.ts
apps/api/src/app.ts
apps/api/src/auth/session.ts
apps/api/src/http/routes.ts
apps/api/src/workspaces/service.ts
apps/api/src/canvas/service.ts
apps/api/src/messages/service.ts
apps/api/src/ai/provider.ts
apps/api/src/ai/fake-provider.ts
apps/api/src/realtime/hub.ts
apps/api/src/realtime/ws.ts
apps/api/src/events/factory.ts
apps/api/src/test/app.test.ts
apps/api/src/test/realtime.test.ts

apps/web/package.json
apps/web/next.config.ts
apps/web/src/app/layout.tsx
apps/web/src/app/page.tsx
apps/web/src/app/workspaces/[workspaceId]/page.tsx
apps/web/src/features/auth/LoginPage.tsx
apps/web/src/features/workspaces/WorkspaceListPage.tsx
apps/web/src/features/workspace-session/WorkspaceSessionProvider.tsx
apps/web/src/features/workspace-session/store.ts
apps/web/src/features/realtime/client.ts
apps/web/src/features/commands/createCommands.ts
apps/web/src/features/canvas/CanvasView.tsx
apps/web/src/features/canvas/CanvasNodeView.tsx
apps/web/src/features/canvas/SelectionFollowupToolbar.tsx
apps/web/src/features/node-chat/NodeChatPanel.tsx
apps/web/src/features/node-chat/MessageList.tsx
apps/web/src/features/node-chat/MessageComposer.tsx
apps/web/src/shared/api.ts
apps/web/src/shared/styles.css

apps/web/e2e/multi-window-sync.spec.ts
```

## Task 1: Monorepo Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `docker-compose.yml`
- Create: `.env.example`

- [x] **Step 1: Create root package metadata**

Create `package.json`:

```json
{
  "name": "inquara",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm-run-all --parallel dev:api dev:web",
    "dev:api": "npm --workspace @inquara/api run dev",
    "dev:web": "npm --workspace @inquara/web run dev",
    "build": "npm run build --workspaces",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "npm --workspace @inquara/db run generate",
    "db:migrate": "npm --workspace @inquara/db run migrate",
    "db:seed": "npm --workspace @inquara/db run seed"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "npm-run-all": "^4.1.5",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  }
}
```

- [x] **Step 2: Add shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}
```

- [x] **Step 3: Add root test config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node"
  }
});
```

- [x] **Step 4: Add local PostgreSQL service**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: inquara
      POSTGRES_PASSWORD: inquara
      POSTGRES_DB: inquara
    ports:
      - "5432:5432"
    volumes:
      - inquara-postgres:/var/lib/postgresql/data

volumes:
  inquara-postgres:
```

- [x] **Step 5: Add environment example**

Create `.env.example`:

```text
DATABASE_URL="postgresql://inquara:inquara@localhost:5432/inquara?schema=public"
SESSION_SECRET="replace-with-at-least-32-random-characters"
WEB_ORIGIN="http://localhost:3000"
API_ORIGIN="http://localhost:4000"
NEXT_PUBLIC_API_ORIGIN="http://localhost:4000"
NEXT_PUBLIC_WS_ORIGIN="ws://localhost:4000"
AI_PROVIDER="fake"
OPENAI_COMPATIBLE_BASE_URL=""
OPENAI_COMPATIBLE_API_KEY=""
OPENAI_COMPATIBLE_MODEL=""
```

- [x] **Step 6: Verify scaffold**

Run: `npm install`

Expected: dependencies install and a `package-lock.json` is created.

Run: `npm test`

Expected: Vitest starts and exits with no tests found or no failing tests.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json vitest.config.ts docker-compose.yml .env.example
git commit -m "chore: scaffold production monorepo"
```

## Task 2: Shared Domain Contracts

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/src/index.ts`
- Create: `packages/domain/src/schemas.ts`
- Create: `packages/domain/src/events.ts`
- Create: `packages/domain/src/commands.ts`
- Create: `packages/domain/src/reducer.ts`
- Create: `packages/domain/src/reducer.test.ts`

- [ ] **Step 1: Create domain package**

Create `packages/domain/package.json`:

```json
{
  "name": "@inquara/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.25.0"
  }
}
```

- [ ] **Step 2: Define schemas**

Create `packages/domain/src/schemas.ts` with user, workspace, node, edge, and message schemas. Use neutral `CanvasNode` naming and no node `type` field:

```ts
import { z } from "zod";

export const IdSchema = z.string().min(1);
export const IsoDateSchema = z.string().min(1);

export const WorkspaceSchema = z.object({
  id: IdSchema,
  ownerId: IdSchema,
  title: z.string().min(1),
  version: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema
});

export const CanvasNodeSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  title: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  collapsed: z.boolean(),
  parentNodeId: IdSchema.nullable(),
  sourceNodeId: IdSchema.nullable(),
  sourceMessageId: IdSchema.nullable(),
  sourceQuote: z.string().nullable(),
  sourceRangeStart: z.number().int().nonnegative().nullable(),
  sourceRangeEnd: z.number().int().nonnegative().nullable(),
  version: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema
});

export const CanvasEdgeSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  sourceNodeId: IdSchema,
  targetNodeId: IdSchema,
  sourceMessageId: IdSchema.nullable(),
  label: z.string(),
  createdAt: IsoDateSchema
});

export const NodeMessageSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  nodeId: IdSchema,
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  status: z.enum(["complete", "streaming", "failed"]),
  model: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema
});

export const WorkspaceSnapshotSchema = z.object({
  workspace: WorkspaceSchema,
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  messages: z.array(NodeMessageSchema)
});

export type Workspace = z.infer<typeof WorkspaceSchema>;
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type NodeMessage = z.infer<typeof NodeMessageSchema>;
export type WorkspaceSnapshot = z.infer<typeof WorkspaceSnapshotSchema>;
```

- [ ] **Step 3: Define commands**

Create `packages/domain/src/commands.ts`:

```ts
import { z } from "zod";
import { IdSchema } from "./schemas";

const BaseCommandSchema = z.object({
  clientMutationId: z.string().min(1),
  workspaceId: IdSchema
});

export const CreateNodeAtPositionCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.createAtPosition"),
  title: z.string().min(1).default("New chat"),
  x: z.number(),
  y: z.number()
});

export const CreateNodeFromSelectionCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.createFromSelection"),
  sourceNodeId: IdSchema,
  sourceMessageId: IdSchema,
  sourceQuote: z.string().min(1).max(2000),
  sourceRangeStart: z.number().int().nonnegative(),
  sourceRangeEnd: z.number().int().nonnegative(),
  x: z.number(),
  y: z.number()
});

export const UpdateNodePositionCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.updatePosition"),
  nodeId: IdSchema,
  x: z.number(),
  y: z.number()
});

export const SendUserMessageCommandSchema = BaseCommandSchema.extend({
  type: z.literal("message.sendUserMessage"),
  nodeId: IdSchema,
  content: z.string().min(1).max(20000)
});

export const WorkspaceCommandSchema = z.discriminatedUnion("type", [
  CreateNodeAtPositionCommandSchema,
  CreateNodeFromSelectionCommandSchema,
  UpdateNodePositionCommandSchema,
  SendUserMessageCommandSchema
]);

export type WorkspaceCommand = z.infer<typeof WorkspaceCommandSchema>;
```

- [ ] **Step 4: Define events and reducer**

Create `packages/domain/src/events.ts` and `packages/domain/src/reducer.ts` so events can be applied identically in tests and the web app:

```ts
// packages/domain/src/events.ts
import { z } from "zod";
import { CanvasEdgeSchema, CanvasNodeSchema, IdSchema, NodeMessageSchema } from "./schemas";

const BaseEventSchema = z.object({
  id: IdSchema,
  workspaceId: IdSchema,
  version: z.number().int().positive(),
  clientMutationId: z.string().nullable(),
  createdAt: z.string().min(1)
});

export const WorkspaceEventSchema = z.discriminatedUnion("type", [
  BaseEventSchema.extend({ type: z.literal("workspace.node.created"), node: CanvasNodeSchema }),
  BaseEventSchema.extend({ type: z.literal("workspace.node.updated"), node: CanvasNodeSchema }),
  BaseEventSchema.extend({ type: z.literal("workspace.edge.created"), edge: CanvasEdgeSchema }),
  BaseEventSchema.extend({ type: z.literal("workspace.message.created"), message: NodeMessageSchema }),
  BaseEventSchema.extend({ type: z.literal("workspace.message.delta"), messageId: IdSchema, delta: z.string() }),
  BaseEventSchema.extend({ type: z.literal("workspace.message.updated"), message: NodeMessageSchema }),
  BaseEventSchema.extend({ type: z.literal("workspace.message.failed"), message: NodeMessageSchema })
]);

export type WorkspaceEvent = z.infer<typeof WorkspaceEventSchema>;
```

```ts
// packages/domain/src/reducer.ts
import type { WorkspaceEvent } from "./events";
import type { WorkspaceSnapshot } from "./schemas";

export function applyWorkspaceEvent(snapshot: WorkspaceSnapshot, event: WorkspaceEvent): WorkspaceSnapshot {
  if (event.version <= snapshot.workspace.version) return snapshot;

  const workspace = { ...snapshot.workspace, version: event.version, updatedAt: event.createdAt };

  if (event.type === "workspace.node.created") {
    return { ...snapshot, workspace, nodes: [...snapshot.nodes, event.node] };
  }
  if (event.type === "workspace.node.updated") {
    return { ...snapshot, workspace, nodes: snapshot.nodes.map(node => node.id === event.node.id ? event.node : node) };
  }
  if (event.type === "workspace.edge.created") {
    return { ...snapshot, workspace, edges: [...snapshot.edges, event.edge] };
  }
  if (event.type === "workspace.message.created") {
    return { ...snapshot, workspace, messages: [...snapshot.messages, event.message] };
  }
  if (event.type === "workspace.message.delta") {
    return {
      ...snapshot,
      workspace,
      messages: snapshot.messages.map(message =>
        message.id === event.messageId ? { ...message, content: message.content + event.delta } : message
      )
    };
  }
  if (event.type === "workspace.message.updated" || event.type === "workspace.message.failed") {
    return {
      ...snapshot,
      workspace,
      messages: snapshot.messages.map(message => message.id === event.message.id ? event.message : message)
    };
  }
  return snapshot;
}
```

- [ ] **Step 5: Add reducer tests**

Create `packages/domain/src/reducer.test.ts` with tests for node creation and streamed message deltas.

Run: `npm test -- packages/domain/src/reducer.test.ts`

Expected: tests pass after `applyWorkspaceEvent` is implemented.

- [ ] **Step 6: Export package API**

Create `packages/domain/src/index.ts`:

```ts
export * from "./schemas";
export * from "./commands";
export * from "./events";
export * from "./reducer";
```

- [ ] **Step 7: Commit**

```bash
git add packages/domain package.json package-lock.json
git commit -m "feat: add shared workspace domain contracts"
```

## Task 3: Config Package

**Files:**
- Create: `packages/config/package.json`
- Create: `packages/config/src/index.ts`

- [ ] **Step 1: Create config package**

Create `packages/config/package.json`:

```json
{
  "name": "@inquara/config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "dependencies": {
    "zod": "^3.25.0"
  }
}
```

- [ ] **Step 2: Implement environment parsing**

Create `packages/config/src/index.ts`:

```ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  AI_PROVIDER: z.enum(["fake", "openai-compatible"]).default("fake"),
  OPENAI_COMPATIBLE_BASE_URL: z.string().optional().default(""),
  OPENAI_COMPATIBLE_API_KEY: z.string().optional().default(""),
  OPENAI_COMPATIBLE_MODEL: z.string().optional().default("")
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return EnvSchema.parse(env);
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/config package.json package-lock.json
git commit -m "feat: add shared config package"
```

## Task 4: Database Package And Prisma Schema

**Files:**
- Create: `packages/db/package.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/client.ts`
- Create: `packages/db/src/seed.ts`

- [ ] **Step 1: Create db package**

Create `packages/db/package.json`:

```json
{
  "name": "@inquara/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "prisma generate --schema prisma/schema.prisma",
    "migrate": "prisma migrate dev --schema prisma/schema.prisma",
    "seed": "tsx src/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^6.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create Prisma schema**

Create `packages/db/prisma/schema.prisma`. Use `CanvasNode` and `NodeMessage`; do not add node `type` or JSON payload columns.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String      @id @default(cuid())
  email      String      @unique
  name       String?
  avatarUrl  String?     @map("avatar_url")
  workspaces Workspace[]
  createdAt  DateTime    @default(now()) @map("created_at")
  updatedAt  DateTime    @updatedAt @map("updated_at")

  @@map("users")
}

model Workspace {
  id         String        @id @default(cuid())
  ownerId    String        @map("owner_id")
  owner      User          @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  title      String
  version    Int           @default(0)
  nodes      CanvasNode[]
  edges      CanvasEdge[]
  messages   NodeMessage[]
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")
  archivedAt DateTime?     @map("archived_at")

  @@index([ownerId, updatedAt])
  @@map("workspaces")
}

model CanvasNode {
  id                String        @id @default(cuid())
  workspaceId       String        @map("workspace_id")
  workspace         Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  title             String
  x                 Float
  y                 Float
  width             Float
  height            Float
  collapsed         Boolean       @default(false)
  parentNodeId      String?       @map("parent_node_id")
  parentNode        CanvasNode?   @relation("NodeChildren", fields: [parentNodeId], references: [id], onDelete: SetNull)
  childNodes        CanvasNode[]  @relation("NodeChildren")
  sourceNodeId      String?       @map("source_node_id")
  sourceNode        CanvasNode?   @relation("SourceNode", fields: [sourceNodeId], references: [id], onDelete: SetNull)
  sourcedNodes      CanvasNode[]  @relation("SourceNode")
  sourceMessageId   String?       @map("source_message_id")
  sourceMessage     NodeMessage?  @relation("SourceMessageNodes", fields: [sourceMessageId], references: [id], onDelete: SetNull)
  sourceQuote       String?       @map("source_quote")
  sourceRangeStart  Int?          @map("source_range_start")
  sourceRangeEnd    Int?          @map("source_range_end")
  version           Int           @default(0)
  messages          NodeMessage[]
  outgoingEdges     CanvasEdge[]  @relation("OutgoingEdges")
  incomingEdges     CanvasEdge[]  @relation("IncomingEdges")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  @@index([workspaceId])
  @@map("canvas_nodes")
}

model CanvasEdge {
  id              String       @id @default(cuid())
  workspaceId     String       @map("workspace_id")
  workspace       Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  sourceNodeId    String       @map("source_node_id")
  sourceNode      CanvasNode   @relation("OutgoingEdges", fields: [sourceNodeId], references: [id], onDelete: Cascade)
  targetNodeId    String       @map("target_node_id")
  targetNode      CanvasNode   @relation("IncomingEdges", fields: [targetNodeId], references: [id], onDelete: Cascade)
  sourceMessageId String?      @map("source_message_id")
  sourceMessage   NodeMessage? @relation(fields: [sourceMessageId], references: [id], onDelete: SetNull)
  label           String
  createdAt       DateTime     @default(now()) @map("created_at")

  @@index([workspaceId])
  @@map("canvas_edges")
}

model NodeMessage {
  id                String       @id @default(cuid())
  workspaceId       String       @map("workspace_id")
  workspace         Workspace    @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  nodeId            String       @map("node_id")
  node              CanvasNode   @relation(fields: [nodeId], references: [id], onDelete: Cascade)
  role              String
  content           String
  status            String
  model             String?
  errorMessage      String?      @map("error_message")
  sourceForNodes    CanvasNode[] @relation("SourceMessageNodes")
  sourceForEdges    CanvasEdge[]
  createdAt         DateTime     @default(now()) @map("created_at")
  updatedAt         DateTime     @updatedAt @map("updated_at")

  @@index([nodeId, createdAt])
  @@index([workspaceId, createdAt])
  @@map("node_messages")
}
```

- [ ] **Step 3: Create Prisma client export**

Create `packages/db/src/client.ts`:

```ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
export type { PrismaClient };
```

- [ ] **Step 4: Create seed script**

Create `packages/db/src/seed.ts` to create a demo user, one workspace, and one root node:

```ts
import { prisma } from "./client";

const user = await prisma.user.upsert({
  where: { email: "demo@inquara.local" },
  update: {},
  create: { email: "demo@inquara.local", name: "Demo User" }
});

const workspace = await prisma.workspace.create({
  data: { ownerId: user.id, title: "First canvas" }
});

const rootNode = await prisma.canvasNode.create({
  data: {
    workspaceId: workspace.id,
    title: "Main chat",
    x: 120,
    y: 120,
    width: 420,
    height: 520,
    collapsed: false
  }
});

await prisma.nodeMessage.create({
  data: {
    workspaceId: workspace.id,
    nodeId: rootNode.id,
    role: "assistant",
    content: "Ask me anything. Select part of an answer to branch into a focused follow-up.",
    status: "complete"
  }
});

console.log(`Seeded ${user.email} with workspace ${workspace.id}`);
await prisma.$disconnect();
```

- [ ] **Step 5: Run migration and seed**

Run: `docker compose up -d postgres`

Expected: PostgreSQL is listening on port `5432`.

Run: `npm run db:generate`

Expected: Prisma client is generated.

Run: `npm run db:migrate -- --name init`

Expected: initial migration is created and applied.

Run: `npm run db:seed`

Expected: console prints the seeded demo workspace id.

- [ ] **Step 6: Commit**

```bash
git add packages/db package.json package-lock.json
git commit -m "feat: add database schema"
```

## Task 5: API Foundation, Auth, And Workspace Snapshots

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/auth/session.ts`
- Create: `apps/api/src/http/routes.ts`
- Create: `apps/api/src/workspaces/service.ts`
- Create: `apps/api/src/test/app.test.ts`

- [ ] **Step 1: Create API package**

Create `apps/api/package.json`:

```json
{
  "name": "@inquara/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc --noEmit",
    "test": "vitest run src/test"
  },
  "dependencies": {
    "@fastify/cookie": "^11.0.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/websocket": "^11.0.0",
    "@inquara/db": "0.0.0",
    "@inquara/domain": "0.0.0",
    "fastify": "^5.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  }
}
```

Create `apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Create `apps/api/src/server.ts`:

```ts
import { buildApp } from "./app";

const app = await buildApp();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });
console.log(`Inquara API running at http://localhost:${port}`);
```

Create `apps/api/src/app.ts`:

```ts
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import Fastify from "fastify";
import { registerRoutes } from "./http/routes";

export async function buildApp() {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
    credentials: true
  });
  await app.register(cookie);
  await app.register(websocket);
  await registerRoutes(app);
  return app;
}
```

- [ ] **Step 2: Implement session auth**

Create `apps/api/src/auth/session.ts` with signed-cookie session helpers:

```ts
import crypto from "node:crypto";

export function signSession(userId: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({ userId })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySession(value: string | undefined, secret: string): string | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string };
  return parsed.userId || null;
}
```

- [ ] **Step 3: Implement workspace service**

Create `apps/api/src/workspaces/service.ts` with:

- `loginWithEmail(email)`: upsert user and return session token.
- `listWorkspaces(userId)`: return non-archived workspaces.
- `createWorkspace(userId, title)`: create workspace and root node.
- `getWorkspaceSnapshot(userId, workspaceId)`: verify ownership and return workspace, nodes, edges, and messages.

- [ ] **Step 4: Register HTTP routes**

Create routes:

```text
POST /auth/login
GET /auth/me
GET /workspaces
POST /workspaces
GET /workspaces/:workspaceId/snapshot
```

For `POST /auth/login`, accept `{ "email": "demo@inquara.local" }`, upsert the user, set `inquara_session`, and return the user.

- [ ] **Step 5: Add API tests**

Create tests that:

- Log in with an email.
- Create a workspace.
- Fetch the workspace snapshot with the session cookie.
- Verify the snapshot contains one root node and no node `type` field.

Run: `npm --workspace @inquara/api test`

Expected: tests pass against a test database or mocked Prisma client.

- [ ] **Step 6: Commit**

```bash
git add apps/api package.json package-lock.json
git commit -m "feat: add api auth and workspace snapshots"
```

## Task 6: Canvas Commands And Workspace Events

**Files:**
- Create: `apps/api/src/canvas/service.ts`
- Create: `apps/api/src/events/factory.ts`
- Modify: `apps/api/src/workspaces/service.ts`
- Test: `apps/api/src/test/app.test.ts`

- [ ] **Step 1: Implement event factory**

Create event helpers for:

- `workspace.node.created`
- `workspace.node.updated`
- `workspace.edge.created`

Each helper must include `id`, `workspaceId`, `version`, `clientMutationId`, and `createdAt`.

- [ ] **Step 2: Implement canvas services**

Create:

- `createNodeAtPosition(userId, command)`
- `createNodeFromSelection(userId, command)`
- `updateNodePosition(userId, command)`

Each service should run in a Prisma transaction, verify workspace ownership, update `workspaces.version`, and return events to broadcast.

- [ ] **Step 3: Add tests**

Add tests that:

- Create a node at a position.
- Create a follow-up node from a selected source message.
- Verify a `canvas_edges` row is created for the follow-up.
- Verify `sourceQuote`, `sourceRangeStart`, and `sourceRangeEnd` are stored on the child node.

Run: `npm --workspace @inquara/api test`

Expected: all canvas command tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/canvas apps/api/src/events apps/api/src/test
git commit -m "feat: add canvas command services"
```

## Task 7: WebSocket Realtime Hub

**Files:**
- Create: `apps/api/src/realtime/hub.ts`
- Create: `apps/api/src/realtime/ws.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/test/realtime.test.ts`

- [ ] **Step 1: Implement in-process workspace hub**

Create `WorkspaceHub` with:

- `subscribe(workspaceId, socket)`
- `unsubscribe(workspaceId, socket)`
- `broadcast(workspaceId, event)`
- `subscriberCount(workspaceId)`

- [ ] **Step 2: Implement WebSocket route**

Add `GET /realtime` WebSocket route. The client sends:

```json
{ "type": "subscribe", "workspaceId": "..." }
```

Then command envelopes:

```json
{ "type": "command", "command": { "type": "node.updatePosition", "clientMutationId": "...", "workspaceId": "...", "nodeId": "...", "x": 240, "y": 120 } }
```

The route validates commands with `WorkspaceCommandSchema`, dispatches to canvas/message services, and broadcasts returned events.

- [ ] **Step 3: Add realtime tests**

Add tests that open two WebSocket clients for the same workspace, send `node.updatePosition` from one client, and assert both clients receive `workspace.node.updated`.

Run: `npm --workspace @inquara/api test`

Expected: realtime tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/realtime apps/api/src/app.ts apps/api/src/test/realtime.test.ts
git commit -m "feat: add workspace realtime websocket"
```

## Task 8: Message Commands And Fake AI Streaming

**Files:**
- Create: `apps/api/src/messages/service.ts`
- Create: `apps/api/src/ai/provider.ts`
- Create: `apps/api/src/ai/fake-provider.ts`
- Modify: `apps/api/src/realtime/ws.ts`
- Test: `apps/api/src/test/realtime.test.ts`

- [ ] **Step 1: Define AI provider interface**

Create `apps/api/src/ai/provider.ts`:

```ts
export type ChatContextMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StreamHandlers = {
  onDelta(delta: string): Promise<void> | void;
};

export interface AIProvider {
  streamReply(messages: ChatContextMessage[], handlers: StreamHandlers): Promise<{ content: string; model: string }>;
}
```

- [ ] **Step 2: Implement fake provider**

Create `apps/api/src/ai/fake-provider.ts`:

```ts
import type { AIProvider } from "./provider";

export const fakeAIProvider: AIProvider = {
  async streamReply(messages, handlers) {
    const latest = [...messages].reverse().find(message => message.role === "user");
    const parts = [
      `Here is a focused explanation of "${latest?.content ?? "this question"}". `,
      "You can branch from any sentence that feels unclear. ",
      "The new branch keeps the main canvas readable while preserving the source context."
    ];
    let content = "";
    for (const part of parts) {
      content += part;
      await handlers.onDelta(part);
    }
    return { content, model: "fake-inquara-stream" };
  }
};
```

- [ ] **Step 3: Implement message service**

Implement `sendUserMessage(userId, command, provider, broadcast)`:

- Verify workspace ownership.
- Create complete user message.
- Create streaming assistant message.
- Broadcast `workspace.message.created` for both messages.
- Build context from node messages plus source quote metadata.
- Stream fake AI deltas and broadcast `workspace.message.delta`.
- Persist final assistant content with `status = complete`.
- Broadcast `workspace.message.updated`.
- On error, set assistant status to `failed` and broadcast `workspace.message.failed`.

- [ ] **Step 4: Add streaming test**

Add a WebSocket test that:

- Sends `message.sendUserMessage`.
- Receives a user `message.created`.
- Receives an assistant `message.created`.
- Receives at least one `message.delta`.
- Receives final `message.updated` with `status = complete`.

Run: `npm --workspace @inquara/api test`

Expected: streaming events arrive in order.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/messages apps/api/src/ai apps/api/src/realtime apps/api/src/test
git commit -m "feat: stream assistant replies through realtime events"
```

## Task 9: Web App Shell, Login, And Workspace List

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/features/auth/LoginPage.tsx`
- Create: `apps/web/src/features/workspaces/WorkspaceListPage.tsx`
- Create: `apps/web/src/shared/api.ts`
- Create: `apps/web/src/shared/styles.css`

- [ ] **Step 1: Create web package**

Create `apps/web/package.json`:

```json
{
  "name": "@inquara/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "e2e": "playwright test"
  },
  "dependencies": {
    "@inquara/domain": "0.0.0",
    "@tanstack/react-query": "^5.80.0",
    "@xyflow/react": "^12.0.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.8.0"
  }
}
```

Create `apps/web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true
};

export default nextConfig;
```

Create `apps/web/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Add API client**

Create `apps/web/src/shared/api.ts`:

```ts
const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}
```

- [ ] **Step 3: Implement login page**

`LoginPage` posts to `/auth/login` and reloads the workspace list after success.

- [ ] **Step 4: Implement workspace list**

`WorkspaceListPage` fetches `/workspaces`, renders workspace rows, and creates a workspace via `POST /workspaces`.

- [ ] **Step 5: Verify manually**

Run: `npm run dev`

Expected:

- API runs on `http://localhost:4000`.
- Web runs on `http://localhost:3000`.
- User can log in with `demo@inquara.local`.
- User can create and open a workspace.

- [ ] **Step 6: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "feat: add web login and workspace list"
```

## Task 10: Workspace Session Store And Realtime Client

**Files:**
- Create: `apps/web/src/features/workspace-session/WorkspaceSessionProvider.tsx`
- Create: `apps/web/src/features/workspace-session/store.ts`
- Create: `apps/web/src/features/realtime/client.ts`
- Create: `apps/web/src/features/commands/createCommands.ts`

- [ ] **Step 1: Implement workspace store**

Create a Zustand store holding `WorkspaceSnapshot`, connection status, pending `clientMutationId`s, and an `applyEvent` action that uses `applyWorkspaceEvent` from `@inquara/domain`.

- [ ] **Step 2: Implement realtime client**

Create a browser WebSocket client that connects to `${NEXT_PUBLIC_WS_ORIGIN}/realtime`, sends a subscribe message, exposes `sendCommand(command)`, and calls `onEvent(event)` for server events.

- [ ] **Step 3: Implement command creators**

Command creators must generate `clientMutationId` using `crypto.randomUUID()` and return objects matching `WorkspaceCommandSchema`.

- [ ] **Step 4: Implement session provider**

`WorkspaceSessionProvider` loads `/workspaces/:workspaceId/snapshot`, initializes the store, opens WebSocket subscription, and provides command dispatch.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/workspace-session apps/web/src/features/realtime apps/web/src/features/commands
git commit -m "feat: add workspace session realtime store"
```

## Task 11: Canvas And Chat UI

**Files:**
- Create: `apps/web/src/app/workspaces/[workspaceId]/page.tsx`
- Create: `apps/web/src/features/canvas/CanvasView.tsx`
- Create: `apps/web/src/features/canvas/CanvasNodeView.tsx`
- Create: `apps/web/src/features/canvas/SelectionFollowupToolbar.tsx`
- Create: `apps/web/src/features/node-chat/NodeChatPanel.tsx`
- Create: `apps/web/src/features/node-chat/MessageList.tsx`
- Create: `apps/web/src/features/node-chat/MessageComposer.tsx`

- [ ] **Step 1: Render workspace page**

Route `workspaces/[workspaceId]/page.tsx` should wrap `CanvasView` in `WorkspaceSessionProvider`.

- [ ] **Step 2: Render React Flow canvas**

`CanvasView` maps `CanvasNode` records to React Flow nodes and `CanvasEdge` records to React Flow edges. On node drag stop, send `node.updatePosition`.

- [ ] **Step 3: Render chat node**

`CanvasNodeView` renders the node title, collapse affordance, and `NodeChatPanel`.

- [ ] **Step 4: Implement message list and composer**

`MessageList` renders messages for a node and appends deltas as the store changes. `MessageComposer` sends `message.sendUserMessage`.

- [ ] **Step 5: Implement selection follow-up**

When selected text comes from an assistant message, show `SelectionFollowupToolbar`. On click, send `node.createFromSelection` with `sourceMessageId`, text range, quote, and a target position to the right of the source node.

- [ ] **Step 6: Verify manually**

Open the same workspace in two browser windows. In one window:

- Send a message.
- Confirm both windows show streaming assistant text.
- Select assistant text and create a follow-up.
- Confirm both windows show the new node and edge.
- Drag a node.
- Confirm the second window updates its node position.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/workspaces apps/web/src/features/canvas apps/web/src/features/node-chat
git commit -m "feat: add realtime chat canvas UI"
```

## Task 12: End-To-End Smoke Test

**Files:**
- Create: `apps/web/e2e/multi-window-sync.spec.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Add Playwright script**

Add to `apps/web/package.json`:

```json
{
  "scripts": {
    "e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.52.0"
  }
}
```

- [ ] **Step 2: Create multi-window test**

Create a Playwright test that:

- Opens the app.
- Logs in as `demo@inquara.local`.
- Creates or opens a workspace.
- Opens a second browser context for the same workspace.
- Sends a message in the first page.
- Waits for streamed assistant content in both pages.
- Drags a node in the first page.
- Asserts the second page reflects the changed position or updated node state.

- [ ] **Step 3: Run verification**

Run: `npm --workspace @inquara/web run e2e`

Expected: the smoke test passes against local `apps/api` and `apps/web`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/e2e apps/web/package.json package-lock.json
git commit -m "test: add multi-window sync smoke test"
```

## Task 13: OpenAI-Compatible Provider Behind The Existing AI Interface

**Files:**
- Create: `apps/api/src/ai/openai-compatible-provider.ts`
- Modify: `apps/api/src/ai/provider.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/src/test/realtime.test.ts`

- [ ] **Step 1: Implement provider selection**

Create a factory that returns `fakeAIProvider` when `AI_PROVIDER=fake` and an OpenAI-compatible provider when `AI_PROVIDER=openai-compatible`.

- [ ] **Step 2: Implement streaming parser**

The provider should call `${OPENAI_COMPATIBLE_BASE_URL}/chat/completions` or a configured full URL, send model/messages with `stream: true`, parse `data:` SSE chunks, and call `handlers.onDelta(content)` for `choices[0].delta.content`.

- [ ] **Step 3: Add provider test with mocked fetch**

Mock a stream containing:

```text
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" world"}}]}

data: [DONE]
```

Expected: `streamReply` returns `Hello world` and calls `onDelta` twice.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai apps/api/src/test
git commit -m "feat: add openai compatible streaming provider"
```

## Final Verification

Run these commands in order:

```bash
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm test
npm run build
npm run dev
```

Manual verification while `npm run dev` is running:

- Log in.
- Create a workspace.
- Send a message in the root node.
- Watch streamed assistant content.
- Open the same workspace in another browser window.
- Send another message and confirm both windows stream the same assistant reply.
- Select assistant text and create a follow-up node.
- Drag a node and confirm the other window updates.

## Self-Review Notes

- The plan covers account login, workspace creation, persistent nodes/messages/edges, real-time events, AI streaming, and the first React canvas UI.
- The plan keeps the first schema limited to chat behavior and explicitly avoids node `type` and generic node payload fields.
- The fake AI provider gives an early working stream before real provider credentials are required.
- The OpenAI-compatible provider is isolated behind `AIProvider`, so adding it later does not change canvas, message, or WebSocket command code.
- True collaboration, offline editing, non-chat node kinds, semantic search, billing, and sharing remain outside this MVP.
