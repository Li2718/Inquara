import { prisma } from "@inquara/db";
import { createSetupAccount, hasCompletedSetup, SetupError } from "@inquara/db/src/setup.ts";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { createApiTestEnv, resetTestDatabase, stopEphemeralTestDatabase } from "./database";

beforeEach(async () => {
  await resetTestDatabase();
});

afterAll(async () => {
  await stopEphemeralTestDatabase();
});

describe("setup", () => {
  it("creates the setup account with password login compatibility", async () => {
    expect(await hasCompletedSetup(prisma)).toBe(false);

    const account = await createSetupAccount({
      email: "ADMIN@inquara.local",
      displayName: "Founding Admin",
      password: "111111"
    });

    expect(account).toMatchObject({
      email: "admin@inquara.local",
      name: "Founding Admin",
      role: "admin"
    });
    expect(await hasCompletedSetup(prisma)).toBe(true);

    const identity = await prisma.userIdentity.findUniqueOrThrow({
      where: { provider_providerUserId: { provider: "password", providerUserId: "admin@inquara.local" } }
    });
    expect(identity.userId).toBe(account.id);

    const app = await buildApp({ env: createApiTestEnv() });
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "admin@inquara.local", password: "111111" }
    });
    expect(login.statusCode).toBe(200);
    expect(login.json<{ role: string }>().role).toBe("admin");
    await app.close();
  });

  it("rejects setup account creation after any user already exists", async () => {
    await prisma.user.create({
      data: { email: "existing@inquara.local", name: "Existing User" }
    });

    await expect(
      createSetupAccount({
        email: "admin@inquara.local",
        password: "111111"
      })
    ).rejects.toBeInstanceOf(SetupError);

    await expect(prisma.user.findMany({ where: { role: "admin" } })).resolves.toHaveLength(0);
  });

  it("serializes concurrent setup submissions so only one administrator is created", async () => {
    const results = await Promise.allSettled([
      createSetupAccount({
        email: "first@inquara.local",
        password: "111111"
      }),
      createSetupAccount({
        email: "second@inquara.local",
        password: "111111"
      })
    ]);

    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);

    const users = await prisma.user.findMany({
      include: { identities: true }
    });
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ role: "admin" });
    expect(users[0]?.identities).toHaveLength(1);
  });
});
