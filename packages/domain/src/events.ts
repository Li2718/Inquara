import { z } from "zod";
import { CanvasEdgeSchema, CanvasNodeSchema, CanvasSchema, IdSchema, NodeMessageSchema } from "./schemas";

const BaseEventSchema = z.object({
  id: IdSchema,
  canvasId: IdSchema,
  version: z.number().int().positive(),
  clientMutationId: z.string().nullable(),
  createdAt: z.string().min(1)
});

export const CanvasEventSchema = z.discriminatedUnion("type", [
  BaseEventSchema.extend({ type: z.literal("canvas.updated"), canvas: CanvasSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.node.created"), node: CanvasNodeSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.node.updated"), node: CanvasNodeSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.edge.created"), edge: CanvasEdgeSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.message.created"), message: NodeMessageSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.message.delta"), messageId: IdSchema, delta: z.string() }),
  BaseEventSchema.extend({ type: z.literal("canvas.message.updated"), message: NodeMessageSchema }),
  BaseEventSchema.extend({ type: z.literal("canvas.message.failed"), message: NodeMessageSchema })
]);

export type CanvasEvent = z.infer<typeof CanvasEventSchema>;
