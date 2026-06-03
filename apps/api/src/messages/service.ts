import { prisma, type PrismaClient } from "@inquara/db";
import type { NodeMessage, CanvasEvent } from "@inquara/domain";
import type { Prisma } from "@prisma/client";
import type { AIProvider, ChatContextMessage } from "../ai/provider";
import {
  createMessageCreatedEvent,
  createMessageDeltaEvent,
  createMessageFailedEvent,
  createMessageUpdatedEvent
} from "../events/factory";
import { createGeneratedTitleEvents, createInitialTitleFallback, type InitialTitleRequest } from "./titleService";

type Tx = Prisma.TransactionClient;

export type SendUserMessageCommand = {
  type: "message.sendUserMessage";
  clientMutationId: string;
  canvasId: string;
  nodeId: string;
  userMessageId: string;
  assistantMessageId: string;
  content: string;
};

export async function sendUserMessage(
  userId: string,
  command: SendUserMessageCommand,
  provider: AIProvider,
  broadcast: (event: CanvasEvent) => void,
  client: PrismaClient = prisma,
  assertCanContinue?: () => Promise<void>
): Promise<void> {
  const created = await client.$transaction(async tx => {
    await requireOwnedNode(tx, userId, command.canvasId, command.nodeId);
    const initialTitle = await createInitialTitleFallback({
      canvasId: command.canvasId,
      clientMutationId: command.clientMutationId,
      content: command.content,
      tx,
      userId,
      nodeId: command.nodeId
    });

    const userVersion = await incrementCanvasVersion(tx, command.canvasId);
    const userMessage = await tx.nodeMessage.create({
      data: {
        id: command.userMessageId,
        canvasId: command.canvasId,
        nodeId: command.nodeId,
        role: "user",
        content: command.content,
        status: "complete"
      }
    });

    const assistantVersion = await incrementCanvasVersion(tx, command.canvasId);
    const assistantMessage = await tx.nodeMessage.create({
      data: {
        id: command.assistantMessageId,
        canvasId: command.canvasId,
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
      assistantVersion,
      titleEvents: initialTitle.events,
      titleRequest: initialTitle.titleRequest
    };
  });

  for (const event of created.titleEvents) {
    broadcast(event);
  }
  broadcast(
    createMessageCreatedEvent({
      canvasId: command.canvasId,
      version: created.userVersion,
      clientMutationId: command.clientMutationId,
      message: created.userMessage
    })
  );
  broadcast(
    createMessageCreatedEvent({
      canvasId: command.canvasId,
      version: created.assistantVersion,
      clientMutationId: command.clientMutationId,
      message: created.assistantMessage
    })
  );

  try {
    await generateInitialTitle({ broadcast, client, provider, titleRequest: created.titleRequest });
    const context = await loadContext(command.canvasId, command.nodeId, client);
    const result = await provider.streamReply(context, {
      onDelta: async delta => {
        await assertCanContinue?.();
        const version = await client.$transaction(async tx => {
          const nextVersion = await incrementCanvasVersion(tx, command.canvasId);
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
            canvasId: command.canvasId,
            version,
            clientMutationId: command.clientMutationId,
            messageId: created.assistantMessage.id,
            delta
          })
        );
      }
    });

    await assertCanContinue?.();
    const finalMessage = await client.$transaction(async tx => {
      const version = await incrementCanvasVersion(tx, command.canvasId);
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
        canvasId: command.canvasId,
        version: finalMessage.version,
        clientMutationId: command.clientMutationId,
        message: finalMessage.message
      })
    );
  } catch (error) {
    const failedMessage = await client.$transaction(async tx => {
      const version = await incrementCanvasVersion(tx, command.canvasId);
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
        canvasId: command.canvasId,
        version: failedMessage.version,
        clientMutationId: command.clientMutationId,
        message: failedMessage.message
      })
    );
  }
}

async function generateInitialTitle({
  broadcast,
  client,
  provider,
  titleRequest
}: {
  broadcast: (event: CanvasEvent) => void;
  client: PrismaClient;
  provider: AIProvider;
  titleRequest: InitialTitleRequest | null;
}): Promise<void> {
  if (!titleRequest) return;
  const events = await createGeneratedTitleEvents({
    client,
    provider,
    request: titleRequest
  });
  for (const event of events) {
    broadcast(event);
  }
}

async function requireOwnedNode(tx: Tx, userId: string, canvasId: string, nodeId: string): Promise<void> {
  const node = await tx.canvasNode.findFirst({
    where: {
      id: nodeId,
      canvasId,
      canvas: { ownerId: userId, archivedAt: null }
    }
  });
  if (!node) {
    throw new MessageCommandError("Node was not found.");
  }
}

async function loadContext(canvasId: string, nodeId: string, client: PrismaClient): Promise<ChatContextMessage[]> {
  const [node, messages] = await Promise.all([
    client.canvasNode.findFirst({
      where: { id: nodeId, canvasId },
      include: {
        sourceNode: true,
        sourceMessage: true
      }
    }),
    client.nodeMessage.findMany({
      where: { canvasId, nodeId },
      orderBy: { createdAt: "asc" }
    })
  ]);

  const currentMessages = toContextMessages(messages);
  if (!node?.sourceNodeId || !node.sourceMessageId || !node.sourceQuote || !node.sourceNode || !node.sourceMessage) {
    return currentMessages;
  }

  const sourceMessages = await loadSourceConversationChain(canvasId, node.sourceNodeId, client);

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
  canvasId: string,
  nodeId: string,
  client: PrismaClient,
  visited = new Set<string>()
): Promise<ChatContextMessage[]> {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const [node, messages] = await Promise.all([
    client.canvasNode.findFirst({
      where: { id: nodeId, canvasId },
      include: {
        sourceNode: true,
        sourceMessage: true
      }
    }),
    client.nodeMessage.findMany({
      where: { canvasId, nodeId },
      orderBy: { createdAt: "asc" }
    })
  ]);

  if (!node) return [];

  const upstreamMessages = node.sourceNodeId
    ? await loadSourceConversationChain(canvasId, node.sourceNodeId, client, visited)
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

async function incrementCanvasVersion(client: Tx | PrismaClient, canvasId: string): Promise<number> {
  const canvas = await client.canvas.update({
    where: { id: canvasId },
    data: { version: { increment: 1 } }
  });
  return canvas.version;
}

function toNodeMessage(value: {
  id: string;
  canvasId: string;
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
    canvasId: value.canvasId,
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

export class MessageStreamingInterruptedError extends Error {
  constructor(message = "Canvas lease is stale.") {
    super(message);
    this.name = "MessageStreamingInterruptedError";
  }
}
