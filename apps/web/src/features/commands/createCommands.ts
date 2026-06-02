import type { CanvasCommand } from "@inquara/domain";

export function createCommands(canvasId: string, defaults: { newChatTitle: string }) {
  return {
    createNodeAtPosition(input: { title?: string; x: number; y: number }): CanvasCommand {
      return {
        type: "node.createAtPosition",
        clientMutationId: crypto.randomUUID(),
        canvasId,
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
    }): CanvasCommand {
      return {
        type: "node.createFromSelection",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId: crypto.randomUUID(),
        edgeId: crypto.randomUUID(),
        ...input
      };
    },
    updateNodePosition(nodeId: string, position: { x: number; y: number }): CanvasCommand {
      return {
        type: "node.updatePosition",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        x: position.x,
        y: position.y
      };
    },
    organizeCanvasNodes(): CanvasCommand {
      return {
        type: "node.organize",
        clientMutationId: crypto.randomUUID(),
        canvasId
      };
    },
    updateNodeSize(nodeId: string, size: { width: number; height: number }): CanvasCommand {
      return {
        type: "node.updateSize",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        width: size.width,
        height: size.height
      };
    },
    updateNodeScroll(nodeId: string, scrollTop: number): CanvasCommand {
      return {
        type: "node.updateScroll",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        scrollTop
      };
    },
    renameNode(nodeId: string, title: string): CanvasCommand {
      return {
        type: "node.rename",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        title
      };
    },
    hideNodeSubtree(nodeId: string, scrollTop?: number): CanvasCommand {
      return {
        type: "node.hideSubtree",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        ...(scrollTop === undefined ? {} : { scrollTop })
      };
    },
    restoreNodeBranch(nodeId: string, position?: { x: number; y: number }): CanvasCommand {
      return {
        type: "node.restoreBranch",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        ...(position ? { x: position.x, y: position.y } : {})
      };
    },
    deleteNodeSubtree(nodeId: string): CanvasCommand {
      return {
        type: "node.deleteSubtree",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId
      };
    },
    restoreDeletedNodeSubtree(nodeId: string): CanvasCommand {
      return {
        type: "node.restoreDeletedSubtree",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId
      };
    },
    sendUserMessage(nodeId: string, content: string): CanvasCommand {
      return {
        type: "message.sendUserMessage",
        clientMutationId: crypto.randomUUID(),
        canvasId,
        nodeId,
        userMessageId: crypto.randomUUID(),
        assistantMessageId: crypto.randomUUID(),
        content
      };
    }
  };
}
