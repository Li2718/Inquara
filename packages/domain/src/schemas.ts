import { z } from "zod";

export const IdSchema = z.string().min(1);
export const IsoDateSchema = z.string().min(1);

export const CanvasSchema = z.object({
  id: IdSchema,
  ownerId: IdSchema,
  title: z.string().min(1),
  version: z.number().int().nonnegative(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema
});

export const CanvasNodeSchema = z.object({
  id: IdSchema,
  canvasId: IdSchema,
  title: z.string().min(1),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  collapsed: z.boolean(),
  hiddenAt: IsoDateSchema.nullable(),
  deletedAt: IsoDateSchema.nullable(),
  scrollTop: z.number().nonnegative(),
  hiddenStateSnapshot: z.record(z.string(), z.object({
    hiddenAt: IsoDateSchema.nullable(),
    offsetX: z.number().nullable(),
    offsetY: z.number().nullable(),
    scrollTop: z.number().nonnegative()
  })).nullable(),
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
  canvasId: IdSchema,
  sourceNodeId: IdSchema,
  targetNodeId: IdSchema,
  sourceMessageId: IdSchema.nullable(),
  label: z.string(),
  createdAt: IsoDateSchema
});

export const NodeMessageSchema = z.object({
  id: IdSchema,
  canvasId: IdSchema,
  nodeId: IdSchema,
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  status: z.enum(["complete", "streaming", "failed"]),
  model: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema
});

export const CanvasSnapshotSchema = z.object({
  canvas: CanvasSchema,
  nodes: z.array(CanvasNodeSchema),
  edges: z.array(CanvasEdgeSchema),
  messages: z.array(NodeMessageSchema)
});

export type Canvas = z.infer<typeof CanvasSchema>;
export type CanvasNode = z.infer<typeof CanvasNodeSchema>;
export type CanvasEdge = z.infer<typeof CanvasEdgeSchema>;
export type NodeMessage = z.infer<typeof NodeMessageSchema>;
export type CanvasSnapshot = z.infer<typeof CanvasSnapshotSchema>;
