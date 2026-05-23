import type { AppConfig } from "@inquara/config";
import { WorkspaceCommandSchema, type WorkspaceCommand, type WorkspaceEvent } from "@inquara/domain";
import type { FastifyInstance } from "fastify";
import type { RawData, WebSocket } from "ws";
import { z } from "zod";
import { verifySession } from "../auth/session";
import { createNodeAtPosition, createNodeFromSelection, updateNodePosition } from "../canvas/service";
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
  app.get("/realtime", { websocket: true }, (socket, request) => {
    const userId = verifySession(request.cookies[sessionCookieName], config.SESSION_SECRET);
    if (!userId) {
      socket.close(1008, "Unauthorized");
      return;
    }

    socket.on("message", async data => {
      try {
        const envelope = ClientEnvelopeSchema.parse(JSON.parse(data.toString()));
        if (envelope.type === "subscribe") {
          hub.subscribe(envelope.workspaceId, socket);
          socket.send(JSON.stringify({ type: "subscribed", workspaceId: envelope.workspaceId }));
          return;
        }

        const events = await dispatchCommand(userId, envelope.command);
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

async function dispatchCommand(userId: string, command: WorkspaceCommand): Promise<WorkspaceEvent[]> {
  if (command.type === "node.createAtPosition") {
    return createNodeAtPosition(userId, command);
  }
  if (command.type === "node.createFromSelection") {
    return createNodeFromSelection(userId, command);
  }
  if (command.type === "node.updatePosition") {
    return updateNodePosition(userId, command);
  }
  return [];
}

function sendError(socket: WebSocket, error: unknown): void {
  const message = error instanceof Error ? error.message : "Realtime command failed.";
  socket.send(JSON.stringify({ type: "error", error: message }));
}
