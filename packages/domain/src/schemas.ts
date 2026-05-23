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
