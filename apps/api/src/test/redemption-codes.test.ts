import { prisma } from "@inquara/db";
import { seedAdminUser } from "@inquara/db/src/admin";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("redemption codes", () => {
  it("leaves registration open by default in tests", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "open@inquara.local", password: "111111" }
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("requires and redeems a registration code when invitation-only registration is enabled", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const adminCookie = await signInAdmin(app);
    await setInvitationOnly(app, adminCookie, true);

    const blocked = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "blocked@inquara.local", password: "111111" }
    });
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json()).toEqual({ error: "Invitation code is unavailable or expired." });

    const generated = await app.inject({
      method: "POST",
      url: "/admin/codes",
      cookies: { inquara_session: adminCookie },
      payload: { note: "Founding tester" }
    });
    expect(generated.statusCode).toBe(200);
    const code = generated.json<{ code: string }>().code;
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

    const registered = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "invited@inquara.local", password: "111111", redemptionCode: code.toLowerCase() }
    });
    expect(registered.statusCode).toBe(200);

    const reuse = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "reuse@inquara.local", password: "111111", redemptionCode: code }
    });
    expect(reuse.statusCode).toBe(403);

    const redemptions = await prisma.redemptionCodeRedemption.findMany({
      include: { user: true }
    });
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]?.user.email).toBe("invited@inquara.local");

    await app.close();
  });

  it("lets administrators list sources, redemption users, and disable codes", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const adminCookie = await signInAdmin(app);

    const generated = await app.inject({
      method: "POST",
      url: "/admin/codes",
      cookies: { inquara_session: adminCookie },
      payload: { maxRedemptions: 2, note: "Two seats" }
    });
    expect(generated.statusCode).toBe(200);
    const code = generated.json<{ code: string }>().code;

    const first = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "first@inquara.local", password: "111111", redemptionCode: code }
    });
    expect(first.statusCode).toBe(200);

    const list = await app.inject({
      method: "GET",
      url: "/admin/codes",
      cookies: { inquara_session: adminCookie }
    });
    expect(list.statusCode).toBe(200);
    const [listed] = list.json<Array<{
      code: string;
      createdBy: { email: string } | null;
      maxRedemptions: number;
      note: string | null;
      redemptionCount: number;
      redemptions: Array<{ user: { email: string } }>;
      source: string;
    }>>();
    expect(listed).toMatchObject({
      code,
      createdBy: { email: "admin@inquara.local" },
      maxRedemptions: 2,
      note: "Two seats",
      redemptionCount: 1,
      source: "admin"
    });
    expect(listed?.redemptions[0]?.user.email).toBe("first@inquara.local");

    const disabled = await app.inject({
      method: "POST",
      url: `/admin/codes/${listed?.code}/disable`,
      cookies: { inquara_session: adminCookie }
    });
    expect(disabled.statusCode).toBe(200);

    const blocked = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "second@inquara.local", password: "111111", redemptionCode: code }
    });
    expect(blocked.statusCode).toBe(403);

    await app.close();
  });

  it("rejects non-admin access to redemption code administration", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const user = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "user@inquara.local", password: "111111" }
    });
    const cookie = user.cookies.find(item => item.name === "inquara_session")?.value ?? "";

    const response = await app.inject({
      method: "POST",
      url: "/admin/codes",
      cookies: { inquara_session: cookie },
      payload: {}
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("allows browser CORS preflight for the registration settings update", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const response = await app.inject({
      method: "OPTIONS",
      url: "/admin/settings/registration",
      headers: {
        origin: "http://localhost:3000",
        "access-control-request-method": "PUT"
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toContain("PUT");
    await app.close();
  });

  it("uses the stored redemption code length setting without counting existing codes", async () => {
    const app = await buildApp({ env: createApiTestEnv() });
    const adminCookie = await signInAdmin(app);
    await prisma.systemSetting.create({
      data: { key: "redemptionCode.length", value: 7 }
    });

    const generated = await app.inject({
      method: "POST",
      url: "/admin/codes",
      cookies: { inquara_session: adminCookie },
      payload: {}
    });

    expect(generated.statusCode).toBe(200);
    expect(generated.json<{ code: string }>().code).toMatch(/^[A-HJ-NP-Z2-9]{7}$/);
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

async function setInvitationOnly(app: Awaited<ReturnType<typeof buildApp>>, cookie: string, enabled: boolean) {
  const response = await app.inject({
    method: "PUT",
    url: "/admin/settings/registration",
    cookies: { inquara_session: cookie },
    payload: { invitationOnly: enabled }
  });
  expect(response.statusCode).toBe(200);
}
