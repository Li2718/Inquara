import { prisma } from "@inquara/db";
import { WebSocket } from "ws";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let workspaceId = "";
let nodeId = "";

type TestRealtimeMessage = {
  type?: string;
  error?: string;
  event?: {
    type?: string;
    clientMutationId?: string | null;
    node?: {
      x?: number;
      y?: number;
    };
    message?: {
      id: string;
      role: string;
      content: string;
      status: string;
    };
    messageId?: string;
    delta?: string;
  };
};

function expectEvent(message: TestRealtimeMessage): NonNullable<TestRealtimeMessage["event"]> {
  if (!message.event) throw new Error("Expected realtime event message.");
  return message.event;
}

function expectNodeEvent(message: TestRealtimeMessage): NonNullable<NonNullable<TestRealtimeMessage["event"]>["node"]> {
  const event = expectEvent(message);
  if (!event.node) throw new Error("Expected realtime node event.");
  return event.node;
}

function expectMessageEvent(
  message: TestRealtimeMessage
): NonNullable<NonNullable<TestRealtimeMessage["event"]>["message"]> {
  const event = expectEvent(message);
  if (!event.message) throw new Error("Expected realtime message event.");
  return event.message;
}

function expectRealtimeMessage(message: TestRealtimeMessage | undefined): TestRealtimeMessage {
  if (!message) throw new Error("Expected realtime message.");
  return message;
}

beforeEach(async () => {
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "realtime@inquara.local", name: "Realtime User" }
  });
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
    const session = await registerForSession(app, "realtime@inquara.local");

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

    expect(expectNodeEvent(firstEvent).x).toBe(240);
    expect(expectNodeEvent(secondEvent).y).toBe(120);
    expect(expectEvent(secondEvent).clientMutationId).toBe("mutation-ws-position");

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
    const session = await registerForSession(app, "realtime@inquara.local");

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

    const userCreatedMessage = expectRealtimeMessage(userCreated);
    const assistantCreatedMessage = expectRealtimeMessage(assistantCreated);
    const userMessage = expectMessageEvent(userCreatedMessage);
    const assistantMessage = expectMessageEvent(assistantCreatedMessage);
    const deltaEvent = expectEvent(delta);
    const updatedMessage = expectMessageEvent(updated);

    expect(userMessage.role).toBe("user");
    expect(userMessage.content).toBe("What is attention?");
    expect(expectEvent(userCreatedMessage).clientMutationId).toBe("mutation-send-message");
    expect(assistantMessage.role).toBe("assistant");
    expect(assistantMessage.status).toBe("streaming");
    expect(deltaEvent.delta?.length).toBeGreaterThan(0);
    expect(deltaEvent.messageId).toBe(assistantMessage.id);
    expect(updatedMessage.id).toBe(assistantMessage.id);
    expect(updatedMessage.status).toBe("complete");
    expect(updatedMessage.content).toContain("What is attention?");

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
    const session = await registerForSession(app, other.email);

    const socket = await connect(url, session);
    socket.send(JSON.stringify({ type: "subscribe", workspaceId }));

    const error = await waitForMessage(socket, "error");
    expect(error.error).toBe("Workspace was not found.");

    socket.close();
    await app.close();
  });
});

async function registerForSession(app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery staple" }
  });
  if (response.statusCode !== 200) {
    throw new Error(`Expected register to succeed, got ${response.statusCode}: ${response.body}`);
  }
  const cookie = response.cookies.find(item => item.name === "inquara_session")?.value;
  if (!cookie) throw new Error("Expected auth session cookie.");
  return cookie;
}

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

function waitForMessage(socket: WebSocket, type: string): Promise<TestRealtimeMessage> {
  return new Promise(resolve => {
    const handler = (data: WebSocket.RawData) => {
      const parsed = JSON.parse(data.toString()) as TestRealtimeMessage;
      if (parsed.type === type || parsed.event?.type === type) {
        socket.off("message", handler);
        resolve(parsed);
      }
    };
    socket.on("message", handler);
  });
}

function waitForMessages(socket: WebSocket, type: string, count: number): Promise<TestRealtimeMessage[]> {
  return new Promise(resolve => {
    const messages: TestRealtimeMessage[] = [];
    const handler = (data: WebSocket.RawData) => {
      const parsed = JSON.parse(data.toString()) as TestRealtimeMessage;
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
