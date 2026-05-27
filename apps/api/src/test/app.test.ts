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

describe("API auth and workspace snapshots", () => {
  it("returns a health check for local orchestration", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const response = await app.inject({
      method: "GET",
      url: "/healthz"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it("registers with a password, creates a workspace, and returns a snapshot with one chat canvas node", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "demo@inquara.local", password: "correct horse battery staple", rememberMe: true }
    });
    expect(loginResponse.statusCode).toBe(200);
    const cookie = loginResponse.cookies.find(item => item.name === "inquara_session");
    expect(cookie?.value).toBeTruthy();
    expect(loginResponse.headers["set-cookie"]).toContain("Max-Age=2592000");
    const registeredUser = loginResponse.json<{ id: string; email: string; role: string }>();
    expect(registeredUser.email).toBe("demo@inquara.local");
    expect(registeredUser.role).toBe("user");

    const session = await prisma.userSession.findFirstOrThrow({
      where: { userId: registeredUser.id }
    });
    expect(session.rememberMe).toBe(true);
    expect(session.tokenHash).not.toBe(cookie?.value);

    const createResponse = await app.inject({
      method: "POST",
      url: "/workspaces",
      cookies: { inquara_session: cookie?.value ?? "" },
      payload: { title: "My canvas" }
    });
    expect(createResponse.statusCode).toBe(200);
    const workspace = createResponse.json<{ id: string; title: string }>();
    expect(workspace.title).toBe("My canvas");

    const snapshotResponse = await app.inject({
      method: "GET",
      url: `/workspaces/${workspace.id}/snapshot`,
      cookies: { inquara_session: cookie?.value ?? "" }
    });
    expect(snapshotResponse.statusCode).toBe(200);
    const snapshot = snapshotResponse.json();

    expect(snapshot.workspace.id).toBe(workspace.id);
    expect(snapshot.nodes).toHaveLength(1);
    expect(snapshot.nodes[0].title).toBe("Main chat");
    expect(snapshot.nodes[0]).not.toHaveProperty("type");
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0].role).toBe("assistant");

    await app.close();
  });

  it("rejects email-only login and invalid passwords", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const registerResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "secure@inquara.local", password: "correct horse battery staple" }
    });
    expect(registerResponse.statusCode).toBe(200);

    const emailOnlyResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "secure@inquara.local" }
    });
    expect(emailOnlyResponse.statusCode).toBe(400);

    const invalidPasswordResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "secure@inquara.local", password: "wrong password" }
    });
    expect(invalidPasswordResponse.statusCode).toBe(401);

    await app.close();
  });

  it("accepts six-character registration passwords and rejects shorter ones", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const shortResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "too-short@inquara.local", password: "12345" }
    });
    expect(shortResponse.statusCode).toBe(400);

    const sixCharacterResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "six@inquara.local", password: "111111" }
    });
    expect(sixCharacterResponse.statusCode).toBe(200);

    await app.close();
  });

  it("logs in with a password and logs out the current session", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "logout@inquara.local", password: "correct horse battery staple" }
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "logout@inquara.local", password: "correct horse battery staple" }
    });
    expect(loginResponse.statusCode).toBe(200);
    const cookie = loginResponse.cookies.find(item => item.name === "inquara_session");

    const meResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { inquara_session: cookie?.value ?? "" }
    });
    expect(meResponse.statusCode).toBe(200);

    const logoutResponse = await app.inject({
      method: "POST",
      url: "/auth/logout",
      cookies: { inquara_session: cookie?.value ?? "" }
    });
    expect(logoutResponse.statusCode).toBe(204);

    const afterLogoutResponse = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { inquara_session: cookie?.value ?? "" }
    });
    expect(afterLogoutResponse.statusCode).toBe(401);

    await app.close();
  });

  it("rejects duplicate password registration and allows legacy users to set their first password", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "duplicate@inquara.local", password: "correct horse battery staple" }
    });

    const duplicateResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "duplicate@inquara.local", password: "another correct password" }
    });
    expect(duplicateResponse.statusCode).toBe(409);

    await prisma.user.create({
      data: { email: "legacy@inquara.local", name: "Legacy User" }
    });
    const legacyResponse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "legacy@inquara.local", password: "correct horse battery staple" }
    });
    expect(legacyResponse.statusCode).toBe(200);

    const legacy = await prisma.user.findUniqueOrThrow({ where: { email: "legacy@inquara.local" } });
    expect(legacy.passwordHash).toBeTruthy();

    await app.close();
  });

  it("can revoke all sessions for an account", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "devices@inquara.local", password: "correct horse battery staple", rememberMe: true }
    });
    const firstLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "devices@inquara.local", password: "correct horse battery staple", rememberMe: true }
    });
    const secondLogin = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "devices@inquara.local", password: "correct horse battery staple", rememberMe: true }
    });
    const firstCookie = firstLogin.cookies.find(item => item.name === "inquara_session")?.value ?? "";
    const secondCookie = secondLogin.cookies.find(item => item.name === "inquara_session")?.value ?? "";

    const sessionsResponse = await app.inject({
      method: "GET",
      url: "/auth/sessions",
      cookies: { inquara_session: firstCookie }
    });
    expect(sessionsResponse.statusCode).toBe(200);
    expect(sessionsResponse.json<Array<{ id: string }>>().length).toBe(3);

    const revokeResponse = await app.inject({
      method: "POST",
      url: "/auth/logout-all",
      cookies: { inquara_session: firstCookie }
    });
    expect(revokeResponse.statusCode).toBe(204);

    const secondMe = await app.inject({
      method: "GET",
      url: "/auth/me",
      cookies: { inquara_session: secondCookie }
    });
    expect(secondMe.statusCode).toBe(401);

    await app.close();
  });

  it("allows a seeded administrator to sign in through password auth", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const admin = await seedAdminUser(prisma, {
      email: "ADMIN@inquara.local",
      password: "correct horse battery staple"
    });
    expect(admin.role).toBe("admin");
    expect(admin.email).toBe("admin@inquara.local");

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@inquara.local", password: "correct horse battery staple" }
    });
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json<{ role: string }>().role).toBe("admin");

    const identity = await prisma.userIdentity.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "password", providerUserId: "admin@inquara.local" } }
    });
    expect(identity.userId).toBe(admin.id);

    await app.close();
  });

  it("allows the seeded demo user to sign in with the development password", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    await seedPasswordUser(prisma, {
      email: "demo@inquara.local",
      name: "Demo User",
      password: "111111"
    });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "demo@inquara.local", password: "111111" }
    });
    expect(loginResponse.statusCode).toBe(200);
    expect(loginResponse.json<{ email: string; role: string }>()).toMatchObject({
      email: "demo@inquara.local",
      role: "user"
    });

    await app.close();
  });

  it("rejects workspace access without a valid session", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const response = await app.inject({
      method: "GET",
      url: "/workspaces"
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
