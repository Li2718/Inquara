import { prisma, type PrismaClient } from "@inquara/db";
import type { NodeMessage, WorkspaceEvent } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import type { AIProvider, ChatContextMessage } from "../ai/provider";
import {
  createMessageCreatedEvent,
  createMessageDeltaEvent,
  createMessageFailedEvent,
  createMessageUpdatedEvent
} from "../events/factory";

type Tx = Prisma.TransactionClient;

export type SendUserMessageCommand = {
  type: "message.sendUserMessage";
  clientMutationId: string;
  workspaceId: string;
  nodeId: string;
  content: string;
};

export async function sendUserMessage(
  userId: string,
  command: SendUserMessageCommand,
  provider: AIProvider,
  broadcast: (event: WorkspaceEvent) => void,
  client: PrismaClient = prisma
): Promise<void> {
  const created = await client.$transaction(async tx => {
    await requireOwnedNode(tx, userId, command.workspaceId, command.nodeId);

    const userVersion = await incrementWorkspaceVersion(tx, command.workspaceId);
    const userMessage = await tx.nodeMessage.create({
      data: {
        workspaceId: command.workspaceId,
        nodeId: command.nodeId,
        role: "user",
        content: command.content,
        status: "complete"
      }
    });

    const assistantVersion = await incrementWorkspaceVersion(tx, command.workspaceId);
    const assistantMessage = await tx.nodeMessage.create({
      data: {
        workspaceId: command.workspaceId,
        nodeId: command.nodeId,
        role: "assistant",
        content: "",
        status: "streaming"
      }
    });

    return {
      userMessage: toNodeMessage(userMessage),
      userVersion,
      assistantMessage: toNodeMessage(assistantMessage),
      assistantVersion
    };
  });

  broadcast(
    createMessageCreatedEvent({
      workspaceId: command.workspaceId,
      version: created.userVersion,
      clientMutationId: command.clientMutationId,
      message: created.userMessage
    })
  );
  broadcast(
    createMessageCreatedEvent({
      workspaceId: command.workspaceId,
      version: created.assistantVersion,
      clientMutationId: command.clientMutationId,
      message: created.assistantMessage
    })
  );

  try {
    const context = await loadContext(command.workspaceId, command.nodeId, client);
    const result = await provider.streamReply(context, {
      onDelta: async delta => {
        const version = await incrementWorkspaceVersion(client, command.workspaceId);
        broadcast(
          createMessageDeltaEvent({
            workspaceId: command.workspaceId,
            version,
            clientMutationId: command.clientMutationId,
            messageId: created.assistantMessage.id,
            delta
          })
        );
      }
    });

    const finalMessage = await client.$transaction(async tx => {
      const version = await incrementWorkspaceVersion(tx, command.workspaceId);
      const message = await tx.nodeMessage.update({
        where: { id: created.assistantMessage.id },
        data: {
          content: result.content,
          status: "complete",
          model: result.model,
          errorMessage: null
        }
      });
      return { version, message: toNodeMessage(message) };
    });

    broadcast(
      createMessageUpdatedEvent({
        workspaceId: command.workspaceId,
        version: finalMessage.version,
        clientMutationId: command.clientMutationId,
        message: finalMessage.message
      })
    );
  } catch (error) {
    const failedMessage = await client.$transaction(async tx => {
      const version = await incrementWorkspaceVersion(tx, command.workspaceId);
      const message = await tx.nodeMessage.update({
        where: { id: created.assistantMessage.id },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Assistant reply failed."
        }
      });
      return { version, message: toNodeMessage(message) };
    });

    broadcast(
      createMessageFailedEvent({
        workspaceId: command.workspaceId,
        version: failedMessage.version,
        clientMutationId: command.clientMutationId,
        message: failedMessage.message
      })
    );
  }
}

async function requireOwnedNode(tx: Tx, userId: string, workspaceId: string, nodeId: string): Promise<void> {
  const node = await tx.canvasNode.findFirst({
    where: {
      id: nodeId,
      workspaceId,
      workspace: { ownerId: userId, archivedAt: null }
    }
  });
  if (!node) {
    throw new MessageCommandError("Node was not found.");
  }
}

async function loadContext(workspaceId: string, nodeId: string, client: PrismaClient): Promise<ChatContextMessage[]> {
  const messages = await client.nodeMessage.findMany({
    where: { workspaceId, nodeId },
    orderBy: { createdAt: "asc" }
  });
  return messages
    .filter(message => message.role === "user" || message.role === "assistant" || message.role === "system")
    .map(message => ({
      role: message.role as ChatContextMessage["role"],
      content: message.content
    }));
}

async function incrementWorkspaceVersion(client: Tx | PrismaClient, workspaceId: string): Promise<number> {
  const workspace = await client.workspace.update({
    where: { id: workspaceId },
    data: { version: { increment: 1 } }
  });
  return workspace.version;
}

function toNodeMessage(value: {
  id: string;
  workspaceId: string;
  nodeId: string;
  role: string;
  content: string;
  status: string;
  model: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NodeMessage {
  return {
    id: value.id,
    workspaceId: value.workspaceId,
    nodeId: value.nodeId,
    role: value.role as NodeMessage["role"],
    content: value.content,
    status: value.status as NodeMessage["status"],
    model: value.model,
    errorMessage: value.errorMessage,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString()
  };
}

export class MessageCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MessageCommandError";
  }
}
