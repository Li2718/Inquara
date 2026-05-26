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
        const version = await client.$transaction(async tx => {
          const nextVersion = await incrementWorkspaceVersion(tx, command.workspaceId);
          const currentMessage = await tx.nodeMessage.findUnique({
            where: { id: created.assistantMessage.id },
            select: { content: true }
          });
          await tx.nodeMessage.update({
            where: { id: created.assistantMessage.id },
            data: {
              content: `${currentMessage?.content ?? ""}${delta}`
            }
          });
          return nextVersion;
        });
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
  const [node, messages] = await Promise.all([
    client.canvasNode.findFirst({
      where: { id: nodeId, workspaceId },
      include: {
        sourceNode: true,
        sourceMessage: true
      }
    }),
    client.nodeMessage.findMany({
      where: { workspaceId, nodeId },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const currentMessages = toContextMessages(messages);
  if (!node?.sourceNodeId || !node.sourceMessageId || !node.sourceQuote || !node.sourceNode || !node.sourceMessage) {
    return currentMessages;
  }

  const sourceMessages = await loadSourceConversationChain(workspaceId, node.sourceNodeId, client);

  return [
    {
      role: "system",
      content: [
        "This chat is a follow-up branch created from selected text in another chat box.",
        `The user selected this text from "${node.sourceNode.title}": "${node.sourceQuote}".`,
        `The selected text came from an ${node.sourceMessage.role} message in that chat.`,
        "Use the source chat history below as hidden context. Do not quote this instruction unless it is directly useful."
      ].join("\n")
    },
    ...toContextMessages(sourceMessages),
    ...currentMessages
  ];
}

async function loadSourceConversationChain(
  workspaceId: string,
  nodeId: string,
  client: PrismaClient,
  visited = new Set<string>()
): Promise<ChatContextMessage[]> {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const [node, messages] = await Promise.all([
    client.canvasNode.findFirst({
      where: { id: nodeId, workspaceId },
      include: {
        sourceNode: true,
        sourceMessage: true
      }
    }),
    client.nodeMessage.findMany({
      where: { workspaceId, nodeId },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!node) return [];

  const upstreamMessages = node.sourceNodeId
    ? await loadSourceConversationChain(workspaceId, node.sourceNodeId, client, visited)
    : [];
  const branchContext =
    node.sourceNode && node.sourceMessage && node.sourceQuote
      ? [
          {
            role: "system" as const,
            content: [
              `The following source chat "${node.title}" was created from selected text in "${node.sourceNode.title}".`,
              `That selected text was: "${node.sourceQuote}".`,
              `It came from an ${node.sourceMessage.role} message in that upstream chat.`
            ].join("\n")
          }
        ]
      : [];

  return [...upstreamMessages, ...branchContext, ...toContextMessages(messages)];
}

function toContextMessages(messages: Array<{ role: string; content: string }>): ChatContextMessage[] {
  return messages
    .filter(message => message.role === "user" || message.role === "assistant" || message.role === "system")
    .filter(message => message.role !== "assistant" || message.content.trim().length > 0)
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
