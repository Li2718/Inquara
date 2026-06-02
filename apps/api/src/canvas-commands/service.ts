import type { CanvasCommand, CanvasEvent } from "@inquara/domain";
import type { AIProvider } from "../ai/provider";
import {
  createNodeAtPosition,
  createNodeFromSelection,
  deleteNodeSubtree,
  hideNodeSubtree,
  organizeCanvasNodes,
  renameNode,
  restoreDeletedNodeSubtree,
  restoreNodeBranch,
  updateNodePosition,
  updateNodeScroll,
  updateNodeSize
} from "../canvas/service";
import { sendUserMessage } from "../messages/service";

export type LeaseValidation = {
  sessionId: string;
  leaseEpoch: number;
};

export async function dispatchCanvasCommand(
  userId: string,
  command: CanvasCommand
): Promise<CanvasEvent[]> {
  if (command.type === "message.sendUserMessage") {
    throw new UnsupportedCanvasCommandError(command.type);
  }
  if (command.type === "node.createAtPosition") {
    return createNodeAtPosition(userId, command);
  }
  if (command.type === "node.createFromSelection") {
    return createNodeFromSelection(userId, command);
  }
  if (command.type === "node.updatePosition") {
    return updateNodePosition(userId, command);
  }
  if (command.type === "node.organize") {
    return organizeCanvasNodes(userId, command);
  }
  if (command.type === "node.updateSize") {
    return updateNodeSize(userId, command);
  }
  if (command.type === "node.updateScroll") {
    return updateNodeScroll(userId, command);
  }
  if (command.type === "node.rename") {
    return renameNode(userId, command);
  }
  if (command.type === "node.hideSubtree") {
    return hideNodeSubtree(userId, {
      type: command.type,
      clientMutationId: command.clientMutationId,
      canvasId: command.canvasId,
      nodeId: command.nodeId,
      ...(command.scrollTop === undefined ? {} : { scrollTop: command.scrollTop })
    });
  }
  if (command.type === "node.restoreBranch") {
    return restoreNodeBranch(userId, {
      type: command.type,
      clientMutationId: command.clientMutationId,
      canvasId: command.canvasId,
      nodeId: command.nodeId,
      ...(command.x === undefined ? {} : { x: command.x }),
      ...(command.y === undefined ? {} : { y: command.y })
    });
  }
  if (command.type === "node.deleteSubtree") {
    return deleteNodeSubtree(userId, command);
  }
  if (command.type === "node.restoreDeletedSubtree") {
    return restoreDeletedNodeSubtree(userId, command);
  }

  return [];
}

export async function streamCanvasMessageCommand(
  userId: string,
  command: Extract<CanvasCommand, { type: "message.sendUserMessage" }>,
  provider: AIProvider,
  onEvent: (event: CanvasEvent) => Promise<void> | void,
  assertCanContinue?: () => Promise<void>
): Promise<void> {
  await sendUserMessage(userId, command, provider, onEvent, undefined, assertCanContinue);
}

export class UnsupportedCanvasCommandError extends Error {
  constructor(commandType: string) {
    super(`Unsupported canvas command: ${commandType}`);
    this.name = "UnsupportedCanvasCommandError";
  }
}
