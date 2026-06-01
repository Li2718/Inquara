import { prisma, replacePrismaClient } from "@inquara/db";
import type { AppConfig } from "@inquara/config";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";

let container: StartedTestContainer | null = null;
let databaseUrl: string | null = null;

export function createApiTestEnv(overrides: Partial<AppConfig> & Record<string, string | undefined> = {}) {
  const databaseUrl = requireTestDatabaseUrl();

  return {
    DATABASE_URL: databaseUrl,
    REDIS_URL: "redis://test.local:6379",
    SESSION_SECRET: "test-session-secret-with-at-least-32-chars",
    WEB_ORIGIN: "http://localhost:3000",
    API_ORIGIN: "http://localhost:4000",
    AI_PROVIDER: "fake" as const,
    ...overrides
  };
}

export async function resetTestDatabase(): Promise<void> {
  await startEphemeralTestDatabase();
  assertTestDatabaseUrl(process.env.DATABASE_URL);
  await prisma.redemptionCodeRedemption.deleteMany();
  await prisma.redemptionCode.deleteMany();
  await prisma.systemSetting.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.userIdentity.deleteMany();
  await prisma.canvasEdge.deleteMany();
  await prisma.nodeMessage.deleteMany();
  await prisma.canvasNode.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
}

export async function stopEphemeralTestDatabase(): Promise<void> {
  if (!container) {
    if (databaseUrl) {
      await prisma.$disconnect();
      databaseUrl = null;
    }
    return;
  }

  await prisma.$disconnect();
  await container.stop();
  container = null;
  databaseUrl = null;
}

export function assertTestDatabaseUrl(value: string | undefined): void {
  requireTestDatabaseUrl(value);
}

function requireTestDatabaseUrl(value: string | undefined = process.env.DATABASE_URL): string {
  if (!value) {
    throw new Error("DATABASE_URL is required for database tests.");
  }
  const parsed = new URL(value);
  const databaseName = parsed.pathname.replace(/^\/+/, "");
  const schemaName = parsed.searchParams.get("schema") ?? "public";
  if (!databaseName.includes("test") && !schemaName.includes("test")) {
    throw new Error(`Refusing to reset non-test database "${databaseName}" schema "${schemaName}".`);
  }
  return value;
}

async function startEphemeralTestDatabase(): Promise<string> {
  if (databaseUrl) return databaseUrl;

  if (process.env.INQUARA_USE_EXISTING_TEST_DB === "1") {
    databaseUrl = requireTestDatabaseUrl();
    await replacePrismaClient();
    await waitForPostgres(databaseUrl);
    await assertConnectedToEphemeralDatabase();
    return databaseUrl;
  }

  if (process.env.INQUARA_USE_EPHEMERAL_TEST_DB !== "1") {
    throw new Error("Ephemeral test database is disabled.");
  }

  container = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_DB: "inquara_test",
      POSTGRES_USER: "inquara",
      POSTGRES_PASSWORD: "inquara"
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  databaseUrl = `postgresql://inquara:inquara@${container.getHost()}:${container.getMappedPort(5432)}/inquara_test?schema=public`;
  process.env.DATABASE_URL = databaseUrl;
  await replacePrismaClient();
  await waitForPostgres(databaseUrl);
  await runPrismaMigrateDeploy(databaseUrl);
  await assertConnectedToEphemeralDatabase();

  return databaseUrl;
}

async function waitForPostgres(url: string): Promise<void> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      await client.query("select 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // Ignore cleanup failures while Postgres is starting.
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Timed out waiting for ephemeral PostgreSQL.");
}

async function runPrismaMigrateDeploy(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = ["--workspace", "@inquara/db", "exec", "--", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"];
    const child = spawnNpm(args, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        DATABASE_URL: url,
        TESTCONTAINERS_SESSION_ID: process.env.TESTCONTAINERS_SESSION_ID ?? randomUUID()
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) resolve();
      else reject(new Error(`Prisma migrate deploy exited with code ${code ?? 1}.`));
    });
  });
}

function spawnNpm(
  args: string[],
  options: {
    cwd: string;
    env: NodeJS.ProcessEnv;
    stdio: "inherit";
  }
) {
  if (process.platform !== "win32") {
    return spawn("npm", args, options);
  }

  return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", ["npm.cmd", ...args].map(quoteWindowsArg).join(" ")], options);
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

async function assertConnectedToEphemeralDatabase(): Promise<void> {
  const result = await prisma.$queryRaw<Array<{ current_database: string }>>`select current_database()::text`;
  const currentDatabase = result[0]?.current_database ?? "";
  if (!currentDatabase.includes("test")) {
    throw new Error(`Prisma is connected to non-test database "${currentDatabase}".`);
  }
}
