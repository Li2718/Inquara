import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GenericContainer, Wait } from "testcontainers";

const databaseName = "inquara_e2e_test";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let container = null;

try {
  container = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_DB: databaseName,
      POSTGRES_USER: "inquara",
      POSTGRES_PASSWORD: "inquara"
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const databaseUrl = `postgresql://inquara:inquara@${container.getHost()}:${container.getMappedPort(5432)}/${databaseName}?schema=public`;

  await runNpm(["--workspace", "@inquara/db", "exec", "--", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"], {
    DATABASE_URL: databaseUrl
  });

  await runNpm(["--workspace", "@inquara/web", "exec", "--", "playwright", "test", ...process.argv.slice(2)], {
    DATABASE_URL: databaseUrl,
    INQUARA_USE_EXISTING_TEST_DB: "1"
  });
} finally {
  if (container) {
    await container.stop();
  }
}

async function runNpm(args, env) {
  const child = spawnNpm(args, {
    env: {
      ...process.env,
      ...env
    },
    stdio: "inherit"
  });

  const [exitCode] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(`npm ${args.join(" ")} exited with code ${exitCode ?? 1}.`);
  }
}

function spawnNpm(args, options) {
  const spawnOptions = {
    ...options,
    cwd: repoRoot
  };

  if (process.platform !== "win32") {
    return spawn("npm", args, spawnOptions);
  }

  return spawn(
    process.env.ComSpec ?? "cmd.exe",
    ["/d", "/s", "/c", ["npm.cmd", ...args].map(quoteWindowsArg).join(" ")],
    spawnOptions
  );
}

function quoteWindowsArg(value) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}
