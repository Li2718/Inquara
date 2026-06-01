import type { WorkspaceCommand } from "@inquara/domain";

export function createCommands(workspaceId: string, defaults: { newChatTitle: string }) {
  return {
    createNodeAtPosition(input: { title?: string; x: number; y: number }): WorkspaceCommand {
      return {
        type: "node.createAtPosition",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId: crypto.randomUUID(),
        title: input.title ?? defaults.newChatTitle,
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
        nodeId: crypto.randomUUID(),
        edgeId: crypto.randomUUID(),
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
    organizeCanvasNodes(): WorkspaceCommand {
      return {
        type: "node.organize",
        clientMutationId: crypto.randomUUID(),
        workspaceId
      };
    },
    updateNodeSize(nodeId: string, size: { width: number; height: number }): WorkspaceCommand {
      return {
        type: "node.updateSize",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        width: size.width,
        height: size.height
      };
    },
    updateNodeScroll(nodeId: string, scrollTop: number): WorkspaceCommand {
      return {
        type: "node.updateScroll",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        scrollTop
      };
    },
    renameNode(nodeId: string, title: string): WorkspaceCommand {
      return {
        type: "node.rename",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        title
      };
    },
    hideNodeSubtree(nodeId: string, scrollTop?: number): WorkspaceCommand {
      return {
        type: "node.hideSubtree",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        ...(scrollTop === undefined ? {} : { scrollTop })
      };
    },
    restoreNodeBranch(nodeId: string, position?: { x: number; y: number }): WorkspaceCommand {
      return {
        type: "node.restoreBranch",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        ...(position ? { x: position.x, y: position.y } : {})
      };
    },
    deleteNodeSubtree(nodeId: string): WorkspaceCommand {
      return {
        type: "node.deleteSubtree",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId
      };
    },
    restoreDeletedNodeSubtree(nodeId: string): WorkspaceCommand {
      return {
        type: "node.restoreDeletedSubtree",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId
      };
    },
    sendUserMessage(nodeId: string, content: string): WorkspaceCommand {
      return {
        type: "message.sendUserMessage",
        clientMutationId: crypto.randomUUID(),
        workspaceId,
        nodeId,
        userMessageId: crypto.randomUUID(),
        assistantMessageId: crypto.randomUUID(),
        content
      };
    }
  };
}
