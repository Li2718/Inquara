import { prisma } from "@inquara/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

let workspaceId = "";
let nodeId = "";

beforeEach(async () => {
  await resetTestDatabase();

  const user = await prisma.user.create({
    data: { email: "http-workspace@inquara.local", name: "HTTP Workspace User" }
  });
  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, title: "HTTP Canvas" }
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

describe("workspace lease and http command routes", () => {
  it("acquires and renews a workspace lease over HTTP", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");

    const acquired = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });

    expect(acquired.statusCode).toBe(200);
    expect(acquired.json().status).toBe("active");
    expect(acquired.json().lease.leaseEpoch).toBe(1);

    const renewed = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/renew`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a", leaseEpoch: 1 }
    });

    expect(renewed.statusCode).toBe(200);
    expect(renewed.json().status).toBe("active");
    await app.close();
  });

  it("allows explicit reacquire over HTTP after a session was displaced", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");

    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-b" }
    });

    const reacquired = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });

    expect(reacquired.statusCode).toBe(200);
    expect(reacquired.json().status).toBe("active");
    expect(reacquired.json().lease.holderSessionId).toBe("tab-a");
    expect(reacquired.json().lease.leaseEpoch).toBe(3);
    await app.close();
  });

  it("keeps passive recovery ordered after release over HTTP", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");

    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-b" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-c" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/release`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-c" }
    });

    const earliest = await app.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/lease/status?sessionId=tab-b`,
      cookies: { inquara_session: session }
    });
    const later = await app.inject({
      method: "GET",
      url: `/workspaces/${workspaceId}/lease/status?sessionId=tab-a`,
      cookies: { inquara_session: session }
    });

    expect(earliest.statusCode).toBe(200);
    expect(earliest.json().status).toBe("available");
    expect(earliest.json().displacedSeq).toBe(2);
    expect(later.statusCode).toBe(200);
    expect(later.json().status).toBe("blocked");
    expect(later.json().displacedSeq).toBe(3);
    expect(later.json().currentHolderSessionId).toBeNull();
    await app.close();
  });

  it("allows explicit reacquire over HTTP even when another waiter has passive priority", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");

    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-b" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-c" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/release`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-c" }
    });

    const reacquired = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });

    expect(reacquired.statusCode).toBe(200);
    expect(reacquired.json().status).toBe("active");
    expect(reacquired.json().lease.holderSessionId).toBe("tab-a");
    expect(reacquired.json().lease.leaseEpoch).toBe(5);
    await app.close();
  });

  it("rejects stale command writes after a takeover", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-b" }
    });

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/commands`,
      cookies: { inquara_session: session },
      payload: {
        sessionId: "tab-a",
        leaseEpoch: 1,
        command: {
          type: "node.updatePosition",
          clientMutationId: "mutation-http-stale",
          workspaceId,
          nodeId,
          x: 240,
          y: 180
        }
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "Workspace lease is stale." });
    await app.close();
  });

  it("persists canvas mutations through the HTTP command route", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");
    const acquired = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    const leaseEpoch = acquired.json().lease.leaseEpoch as number;

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/commands`,
      cookies: { inquara_session: session },
      payload: {
        sessionId: "tab-a",
        leaseEpoch,
        command: {
          type: "node.updatePosition",
          clientMutationId: "mutation-http-position",
          workspaceId,
          nodeId,
          x: 320,
          y: 260
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().events).toHaveLength(1);
    expect(response.json().events[0].type).toBe("workspace.node.updated");
    const updated = await prisma.canvasNode.findUniqueOrThrow({ where: { id: nodeId } });
    expect(updated.x).toBe(320);
    expect(updated.y).toBe(260);
    await app.close();
  });

  it("streams assistant events over HTTP for the active lease holder", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const session = await registerForSession(app, "http-workspace@inquara.local");
    const acquired = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/lease/acquire`,
      cookies: { inquara_session: session },
      payload: { sessionId: "tab-a" }
    });
    const leaseEpoch = acquired.json().lease.leaseEpoch as number;

    const response = await app.inject({
      method: "POST",
      url: `/workspaces/${workspaceId}/messages/stream`,
      cookies: { inquara_session: session },
      payload: {
        sessionId: "tab-a",
        leaseEpoch,
        command: {
          type: "message.sendUserMessage",
          clientMutationId: "mutation-http-message",
          workspaceId,
          nodeId,
          userMessageId: "http-user-message-1",
          assistantMessageId: "http-assistant-message-1",
          content: "What is attention?"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    const lines = response.body
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line) as { type: string; event: { type: string; clientMutationId: string | null } });
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0]?.type).toBe("event");
    expect(lines[0]?.event.type).toBe("workspace.message.created");
    expect(lines.some(line => line.event.type === "workspace.message.delta")).toBe(true);
    expect(lines.at(-1)?.event.type).toBe("workspace.message.updated");
    expect(lines[0]?.event.clientMutationId).toBe("mutation-http-message");
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
