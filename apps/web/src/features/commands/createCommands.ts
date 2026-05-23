import type { WorkspaceCommand } from "@inquara/domain";

export function createCommands(workspaceId: string) {
  return {
    createNodeAtPosition(input: { title?: string; x: number; y: number }): WorkspaceCommand {
      return {
        type: "node.createAtPosition",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        title: input.title ?? "New chat",
        x: input.x,
        y: input.y
      };
    },
    createNodeFromSelection(input: {
      sourceNodeId: string;
      sourceMessageId: string;
      sourceQuote: string;
      sourceRangeStart: number;
      sourceRangeEnd: number;
      x: number;
      y: number;
    }): WorkspaceCommand {
      return {
        type: "node.createFromSelection",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        ...input
      };
    },
    updateNodePosition(nodeId: string, position: { x: number; y: number }): WorkspaceCommand {
      return {
        type: "node.updatePosition",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        x: position.x,
        y: position.y
      };
    },
    sendUserMessage(nodeId: string, content: string): WorkspaceCommand {
      return {
        type: "message.sendUserMessage",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        content
      };
    }
  };
}
