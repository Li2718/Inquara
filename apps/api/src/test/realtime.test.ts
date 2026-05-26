import { prisma } from "@inquara/db";
import { WebSocket } from "ws";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { signSession } from "../auth/session";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let userId = "";
let workspaceId = "";
let nodeId = "";

beforeEach(async () => {
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "realtime@inquara.local", name: "Realtime User" }
  });
  userId = user.id;
  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, title: "Realtime Canvas" }
  });
  workspaceId = workspace.id;
  const node = await prisma.canvasNode.create({
    data: {
      workspaceId,
      title: "Main chat",
      x: 100,
      y: 100,
      width: 420,
      height: 520,
      collapsed: false
    }
  });
  nodeId = node.id;
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("workspace realtime websocket", () => {
  it("broadcasts node update events to all sockets subscribed to a workspace", async () => {
    const env = createApiTestEnv();
    const app = await buildApp({ env });
    await app.listen({ port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `ws://127.0.0.1:${address.port}/realtime`;
    const session = signSession(userId, env.SESSION_SECRET);

    const first = await connect(url, session);
    const second = await connect(url, session);
    first.send(JSON.stringify({ type: "subscribe", workspaceId }));
    second.send(JSON.stringify({ type: "subscribe", workspaceId }));
    await Promise.all([waitForMessage(first, "subscribed"), waitForMessage(second, "subscribed")]);

    first.send(
      JSON.stringify({
        type: "command",
        command: {
          type: "node.updatePosition",
          clientMutationId: "mutation-ws-position",
          workspaceId,
          nodeId,
          x: 240,
          y: 120
        }
      })
    );

    const [firstEvent, secondEvent] = await Promise.all([
      waitForMessage(first, "workspace.node.updated"),
      waitForMessage(second, "workspace.node.updated")
    ]);

    expect(firstEvent.event.node.x).toBe(240);
    expect(secondEvent.event.node.y).toBe(120);
    expect(secondEvent.event.clientMutationId).toBe("mutation-ws-position");

    first.close();
    second.close();
    await app.close();
  });

  it("streams fake assistant replies through workspace message events", async () => {
    const env = createApiTestEnv();
    const app = await buildApp({ env });
    await app.listen({ port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `ws://127.0.0.1:${address.port}/realtime`;
    const session = signSession(userId, env.SESSION_SECRET);

    const socket = await connect(url, session);
    socket.send(JSON.stringify({ type: "subscribe", workspaceId }));
    await waitForMessage(socket, "subscribed");

    const createdMessagesPromise = waitForMessages(socket, "workspace.message.created", 2);
    const deltaPromise = waitForMessage(socket, "workspace.message.delta");
    const updatedPromise = waitForMessage(socket, "workspace.message.updated");

    socket.send(
      JSON.stringify({
        type: "command",
        command: {
          type: "message.sendUserMessage",
          clientMutationId: "mutation-send-message",
          workspaceId,
          nodeId,
          content: "What is attention?"
        }
      })
    );

    const [userCreated, assistantCreated] = await createdMessagesPromise;
    const delta = await deltaPromise;
    const updated = await updatedPromise;

    expect(userCreated.event.message.role).toBe("user");
    expect(userCreated.event.message.content).toBe("What is attention?");
    expect(userCreated.event.clientMutationId).toBe("mutation-send-message");
    expect(assistantCreated.event.message.role).toBe("assistant");
    expect(assistantCreated.event.message.status).toBe("streaming");
    expect(delta.event.delta.length).toBeGreaterThan(0);
    expect(delta.event.messageId).toBe(assistantCreated.event.message.id);
    expect(updated.event.message.id).toBe(assistantCreated.event.message.id);
    expect(updated.event.message.status).toBe("complete");
    expect(updated.event.message.content).toContain("What is attention?");

    socket.close();
    await app.close();
  });

  it("rejects subscriptions to workspaces owned by another user", async () => {
    const env = createApiTestEnv();
    const other = await prisma.user.create({
      data: { email: "other-realtime@inquara.local", name: "Other User" }
    });
    const app = await buildApp({ env });
    await app.listen({ port: 0 });
    const address = app.server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `ws://127.0.0.1:${address.port}/realtime`;
    const session = signSession(other.id, env.SESSION_SECRET);

    const socket = await connect(url, session);
    socket.send(JSON.stringify({ type: "subscribe", workspaceId }));

    const error = await waitForMessage(socket, "error");
    expect(error.error).toBe("Workspace was not found.");

    socket.close();
    await app.close();
  });
});

function connect(url: string, session: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, {
      headers: {
        Cookie: `inquara_session=${session}`
      }
    });
    socket.once("open", () => resolve(socket));
    socket.once("error", reject);
  });
}

function waitForMessage(socket: WebSocket, type: string): Promise<any> {
  return new Promise(resolve => {
    const handler = (data: WebSocket.RawData) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === type || parsed.event?.type === type) {
        socket.off("message", handler);
        resolve(parsed);
      }
    };
    socket.on("message", handler);
  });
}

function waitForMessages(socket: WebSocket, type: string, count: number): Promise<any[]> {
  return new Promise(resolve => {
    const messages: any[] = [];
    const handler = (data: WebSocket.RawData) => {
      const parsed = JSON.parse(data.toString());
      if (parsed.type === type || parsed.event?.type === type) {
        messages.push(parsed);
        if (messages.length === count) {
          socket.off("message", handler);
          resolve(messages);
        }
      }
    };
    socket.on("message", handler);
  });
}
