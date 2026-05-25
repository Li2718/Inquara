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

export const UpdateNodeSizeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.updateSize"),
  nodeId: IdSchema,
  width: z.number().positive(),
  height: z.number().positive()
});

export const UpdateNodeScrollCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.updateScroll"),
  nodeId: IdSchema,
  scrollTop: z.number().nonnegative()
});

export const RenameNodeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.rename"),
  nodeId: IdSchema,
  title: z.string().min(1).max(120)
});

export const HideNodeSubtreeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.hideSubtree"),
  nodeId: IdSchema,
  scrollTop: z.number().nonnegative().optional()
});

export const RestoreNodeBranchCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.restoreBranch"),
  nodeId: IdSchema
});

export const DeleteNodeSubtreeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.deleteSubtree"),
  nodeId: IdSchema
});

export const RestoreDeletedNodeSubtreeCommandSchema = BaseCommandSchema.extend({
  type: z.literal("node.restoreDeletedSubtree"),
  nodeId: IdSchema
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
  UpdateNodeSizeCommandSchema,
  UpdateNodeScrollCommandSchema,
  RenameNodeCommandSchema,
  HideNodeSubtreeCommandSchema,
  RestoreNodeBranchCommandSchema,
  DeleteNodeSubtreeCommandSchema,
  RestoreDeletedNodeSubtreeCommandSchema,
  SendUserMessageCommandSchema
]);

export type WorkspaceCommand = z.infer<typeof WorkspaceCommandSchema>;
