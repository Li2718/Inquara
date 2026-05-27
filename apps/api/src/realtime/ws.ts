import type { AppConfig } from "@inquara/config";
import { WorkspaceCommandSchema, type WorkspaceCommand, type WorkspaceEvent } from "@inquara/domain";
import type { FastifyInstance } from "fastify";
import type { RawData, WebSocket } from "ws";
import { z } from "zod";
import { createAIProvider } from "../ai/factory";
import { verifySessionToken } from "../auth/session";
import {
  createNodeAtPosition,
  createNodeFromSelection,
  deleteNodeSubtree,
  hideNodeSubtree,
  renameNode,
  restoreDeletedNodeSubtree,
  restoreNodeBranch,
  updateNodePosition,
  updateNodeSize,
  updateNodeScroll
} from "../canvas/service";
import { sendUserMessage } from "../messages/service";
import { getWorkspaceSnapshot, WorkspaceNotFoundError } from "../workspaces/service";
import { WorkspaceHub } from "./hub";

const sessionCookieName = "inquara_session";

const ClientEnvelopeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("subscribe"),
    workspaceId: z.string().min(1)
  }),
  z.object({
    type: z.literal("command"),
    command: WorkspaceCommandSchema
  })
]);

export async function registerRealtimeRoutes(
  app: FastifyInstance,
  config: AppConfig,
  hub = new WorkspaceHub()
): Promise<void> {
  const aiProvider = createAIProvider(config);

  app.get("/realtime", { websocket: true }, (socket, request) => {
    const sessionPromise = verifySessionToken(request.cookies[sessionCookieName]);
    sessionPromise
      .then(session => {
        if (!session) socket.close(1008, "Unauthorized");
      })
      .catch(() => socket.close(1011, "Session check failed"));

    socket.on("message", async data => {
      try {
        const session = await sessionPromise;
        if (!session) {
          socket.close(1008, "Unauthorized");
          return;
        }
        const userId = session.userId;
        const envelope = ClientEnvelopeSchema.parse(JSON.parse(data.toString()));
        if (envelope.type === "subscribe") {
          await getWorkspaceSnapshot(userId, envelope.workspaceId);
          hub.subscribe(envelope.workspaceId, socket);
          socket.send(JSON.stringify({ type: "subscribed", workspaceId: envelope.workspaceId }));
          return;
        }

        const events = await dispatchCommand(userId, envelope.command, hub, aiProvider);
        for (const event of events) {
          hub.broadcast(event.workspaceId, event);
        }
      } catch (error) {
        sendError(socket, error);
      }
    });

    socket.on("close", () => hub.unsubscribeSocket(socket));
  });
}

async function dispatchCommand(
  userId: string,
  command: WorkspaceCommand,
  hub: WorkspaceHub,
  aiProvider: ReturnType<typeof createAIProvider>
): Promise<WorkspaceEvent[]> {
  if (command.type === "node.createAtPosition") {
    return createNodeAtPosition(userId, command);
  }
  if (command.type === "node.createFromSelection") {
    return createNodeFromSelection(userId, command);
  }
  if (command.type === "node.updatePosition") {
    return updateNodePosition(userId, command);
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
      workspaceId: command.workspaceId,
      nodeId: command.nodeId,
      ...(command.scrollTop !== undefined ? { scrollTop: command.scrollTop } : {})
    });
  }
  if (command.type === "node.restoreBranch") {
    return restoreNodeBranch(userId, command);
  }
  if (command.type === "node.deleteSubtree") {
    return deleteNodeSubtree(userId, command);
  }
  if (command.type === "node.restoreDeletedSubtree") {
    return restoreDeletedNodeSubtree(userId, command);
  }
  if (command.type === "message.sendUserMessage") {
    await sendUserMessage(userId, command, aiProvider, event => hub.broadcast(event.workspaceId, event));
    return [];
  }
  return [];
}

function sendError(socket: WebSocket, error: unknown): void {
  if (error instanceof WorkspaceNotFoundError) {
    socket.send(JSON.stringify({ type: "error", error: "Workspace was not found." }));
    return;
  }
  const message = error instanceof Error ? error.message : "Realtime command failed.";
  socket.send(JSON.stringify({ type: "error", error: message }));
}
