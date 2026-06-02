import { prisma } from "@inquara/db";
import { seedAdminUser, seedPasswordUser } from "@inquara/db/src/admin";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("admin users", () => {
  it("lists users with activity and content statistics for administrators", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const adminCookie = await signInAdmin(app);
    const activeUser = await seedPasswordUser(prisma, {
      email: "active@inquara.local",
      name: "Active Analyst",
      password: "111111"
    });
    const quietUser = await seedPasswordUser(prisma, {
      email: "quiet@inquara.local",
      name: "Quiet Reader",
      password: "111111"
    });

    await prisma.user.update({
      where: { id: activeUser.id },
      data: {
        avatarUrl: "https://example.test/active.png",
        createdAt: new Date("2026-05-28T10:00:00.000Z")
      }
    });
    await prisma.user.update({
      where: { id: quietUser.id },
      data: { createdAt: new Date("2026-05-20T10:00:00.000Z") }
    });

    const workspace = await prisma.workspace.create({
      data: { ownerId: activeUser.id, title: "Research", archivedAt: null }
    });
    await prisma.workspace.create({
      data: { ownerId: activeUser.id, title: "Archived", archivedAt: new Date("2026-05-29T00:00:00.000Z") }
    });
    const firstNode = await prisma.canvasNode.create({
      data: { workspaceId: workspace.id, title: "Main chat", x: 0, y: 0, width: 420, height: 520 }
    });
    await prisma.canvasNode.create({
      data: { workspaceId: workspace.id, title: "Deleted chat", x: 0, y: 0, width: 420, height: 520, deletedAt: new Date("2026-05-30T00:00:00.000Z") }
    });

    await prisma.nodeMessage.createMany({
      data: [
        {
          workspaceId: workspace.id,
          nodeId: firstNode.id,
          role: "user",
          content: "First question",
          status: "complete",
          createdAt: new Date("2026-05-30T08:00:00.000Z")
        },
        {
          workspaceId: workspace.id,
          nodeId: firstNode.id,
          role: "assistant",
          content: "Answer",
          status: "complete",
          createdAt: new Date("2026-05-30T08:01:00.000Z")
        },
        {
          workspaceId: workspace.id,
          nodeId: firstNode.id,
          role: "user",
          content: "Second question",
          status: "complete",
          createdAt: new Date("2026-05-31T08:00:00.000Z")
        }
      ]
    });

    await prisma.userSession.createMany({
      data: [
        {
          userId: activeUser.id,
          tokenHash: "active-session-1",
          lastSeenAt: new Date("2026-05-30T13:00:00.000Z"),
          expiresAt: new Date("2026-06-30T00:00:00.000Z"),
          createdAt: new Date("2026-05-30T12:00:00.000Z")
        },
        {
          userId: activeUser.id,
          tokenHash: "active-session-2",
          lastSeenAt: new Date("2026-05-30T15:00:00.000Z"),
          expiresAt: new Date("2026-06-30T00:00:00.000Z"),
          createdAt: new Date("2026-05-30T14:00:00.000Z")
        },
        {
          userId: activeUser.id,
          tokenHash: "active-session-3",
          lastSeenAt: new Date("2026-06-01T09:00:00.000Z"),
          expiresAt: new Date("2026-06-30T00:00:00.000Z"),
          createdAt: new Date("2026-06-01T09:00:00.000Z")
        }
      ]
    });

    const response = await app.inject({
      method: "GET",
      url: "/admin/users",
      cookies: { inquara_session: adminCookie }
    });

    expect(response.statusCode).toBe(200);
    const users = response.json<Array<{
      avatarUrl: string | null;
      canvasCount: number;
      chatCount: number;
      email: string;
      loginDays: number;
      name: string | null;
      questionCount: number;
      registeredDays: number;
      lastLoginAt: string | null;
      lastQuestionAt: string | null;
    }>>();

    expect(users.map(user => user.email)).toEqual([
      "active@inquara.local",
      "admin@inquara.local",
      "quiet@inquara.local"
    ]);
    expect(users[0]).toMatchObject({
      avatarUrl: "https://example.test/active.png",
      canvasCount: 1,
      chatCount: 1,
      email: "active@inquara.local",
      loginDays: 2,
      name: "Active Analyst",
      questionCount: 2,
      registeredDays: expect.any(Number),
      lastLoginAt: "2026-06-01T09:00:00.000Z",
      lastQuestionAt: "2026-05-31T08:00:00.000Z"
    });
    expect(users[2]).toMatchObject({
      canvasCount: 0,
      chatCount: 0,
      email: "quiet@inquara.local",
      loginDays: 0,
      questionCount: 0,
      lastLoginAt: null,
      lastQuestionAt: null
    });

    await app.close();
  });

  it("rejects non-admin user list access", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const user = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@inquara.local", password: "111111" }
    });
    const cookie = user.cookies.find(item => item.name === "inquara_session")?.value ?? "";

    const response = await app.inject({
      method: "GET",
      url: "/admin/users",
      cookies: { inquara_session: cookie }
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });
});

async function signInAdmin(app: Awaited<ReturnType<typeof buildApp>>): Promise<string> {
  await seedAdminUser(prisma, {
    email: "admin@inquara.local",
    password: "111111"
  });

  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: "admin@inquara.local", password: "111111" }
  });
  const cookie = response.cookies.find(item => item.name === "inquara_session")?.value;
  if (!cookie) throw new Error("Expected admin login to set a session cookie.");
  return cookie;
}
