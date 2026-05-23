import { prisma } from "@inquara/db";
import { WebSocket } from "ws";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { signSession } from "../auth/session";

const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://inquara:inquara@localhost:55432/inquara?schema=public",
  SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
  WEB_ORIGIN: "http://localhost:3000",
  API_ORIGIN: "http://localhost:4000",
  AI_PROVIDER: "fake" as const
};

let userId = "";
let workspaceId = "";
let nodeId = "";

beforeEach(async () => {
  await prisma.canvasEdge.deleteMany();
  await prisma.nodeMessage.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

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
  await prisma.$disconnect();
});

describe("workspace realtime websocket", () => {
  it("broadcasts node update events to all sockets subscribed to a workspace", async () => {
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
