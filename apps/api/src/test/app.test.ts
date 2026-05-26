import { prisma } from "@inquara/db";
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

  it("logs in, creates a workspace, and returns a snapshot with one chat canvas node", async () => {
    const app = await buildApp({ env: createApiTestEnv() });

    const loginResponse = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "demo@inquara.local" }
    });
    expect(loginResponse.statusCode).toBe(200);
    const cookie = loginResponse.cookies.find(item => item.name === "inquara_session");
    expect(cookie?.value).toBeTruthy();

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
