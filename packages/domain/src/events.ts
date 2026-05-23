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
