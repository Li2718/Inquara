import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import net from "node:net";
import { Client } from "pg";
import { ensureDatabaseUrl, loadDevelopmentEnv } from "./dev-env.mjs";
import {
  getCloneInfraPlan,
  getCreatePlan,
  getRemovePlan,
  parseWorktreeCommand
} from "./worktree-cli.mjs";
import {
  buildWorktreeDatabaseAdminUrl,
  buildPrivateInfraEnvText,
  escapePostgresIdentifier,
  getSharedDevelopmentFileNames,
  getManagedWorktreeRootDir,
  getWorktreeParentDirName,
  parseWorktreeListPorcelain,
  readPrivateDatabaseName,
  selectAvailablePort,
  selectWorktreeEntry
} from "./worktree-lib.mjs";

const rootDir = getManagedWorktreeRootDir(process.cwd());
const currentDir = process.cwd();

loadDevelopmentEnv(rootDir);
ensureDatabaseUrl(process.env);

async function isPortAvailable(port, host = "127.0.0.1") {
  return new Promise(resolve => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });
    server.once("listening", () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port, host);
  });
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""';
  }

  if (!/[\s"]/u.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function spawnCommand(commandName, args, options = {}) {
  if (process.platform === "win32") {
    const commandLine = [quoteWindowsArg(commandName), ...args.map(quoteWindowsArg)].join(" ");

    return spawn(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: options.cwd ?? rootDir,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
      windowsHide: options.windowsHide ?? false
    });
  }

  return spawn(commandName, args, {
    cwd: options.cwd ?? rootDir,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    windowsHide: options.windowsHide ?? false
  });
}

async function runCommand(commandName, args, options = {}) {
  const child = spawnCommand(commandName, args, options);

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`Command failed (${commandName} ${args.join(" ")}), exit code: ${code ?? "unknown"}`));
    });
  });
}

async function captureCommand(commandName, args, options = {}) {
  const child = spawnCommand(commandName, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stdout = "";
  let stderr = "";

  child.stdout?.on("data", chunk => {
    stdout += String(chunk);
  });

  child.stderr?.on("data", chunk => {
    stderr += String(chunk);
  });

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `Command failed (${commandName} ${args.join(" ")}), exit code: ${code ?? "unknown"}\n${stderr || stdout}`
        )
      );
    });
  });
}

function ensureManagedWorktreeDirectory(rootPath) {
  const dotWorktreesPath = path.join(rootPath, ".worktrees");
  const worktreesPath = path.join(rootPath, "worktrees");
  const worktreeParentDirName = getWorktreeParentDirName({
    dotWorktreesExists: existsSync(dotWorktreesPath),
    worktreesExists: existsSync(worktreesPath)
  });
  const worktreeParentPath = path.join(rootPath, worktreeParentDirName);

  mkdirSync(worktreeParentPath, { recursive: true });
  return {
    worktreeParentDirName,
    worktreeParentPath
  };
}

function copySharedDevelopmentFilesIntoWorktree(rootPath, targetPath) {
  const envDevPath = path.join(rootPath, ".env.dev");

  if (!existsSync(envDevPath)) {
    throw new Error("Missing .env.dev in the main worktree. Create it before creating managed worktrees.");
  }

  for (const fileName of getSharedDevelopmentFileNames({
    envDevExists: true
  })) {
    copyFileSync(path.join(rootPath, fileName), path.join(targetPath, fileName));
  }
}

function parseDatabaseUrl(databaseUrl) {
  const url = new URL(databaseUrl);

  return {
    adminDatabaseUrl: buildWorktreeDatabaseAdminUrl(databaseUrl),
    databaseName: decodeURIComponent(url.pathname.replace(/^\//u, ""))
  };
}

function getPsqlEnv() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Ensure .env.dev is configured before cloning a private database.");
  }

  return parseDatabaseUrl(databaseUrl);
}

async function dropDatabase(databaseName) {
  const { adminDatabaseUrl } = getPsqlEnv();
  const client = new Client({
    connectionString: adminDatabaseUrl
  });

  await client.connect();

  try {
    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [databaseName]
    );
    await client.query(`DROP DATABASE IF EXISTS ${escapePostgresIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
}

async function listWorktrees() {
  const { stdout } = await captureCommand("git", ["worktree", "list", "--porcelain"], {
    cwd: rootDir
  });

  return parseWorktreeListPorcelain(stdout);
}

async function listDockerPublishedPorts() {
  const { stdout } = await captureCommand("docker", ["ps", "--format={{.Ports}}"]);
  const ports = new Set();
  const portPattern = /(?:0\.0\.0\.0|\[::\]|127\.0\.0\.1|\[::1\]):(\d+)->/gu;

  for (const line of stdout.split(/\r?\n/u)) {
    if (line.trim().length === 0) {
      continue;
    }

    for (const match of line.matchAll(portPattern)) {
      ports.add(Number(match[1]));
    }
  }

  return ports;
}

async function ensureBranchDoesNotExist(branchName) {
  const { stdout } = await captureCommand("git", ["branch", "--list", branchName], {
    cwd: rootDir
  });

  if (stdout.trim().length > 0) {
    throw new Error(`Branch "${branchName}" already exists. Create the worktree manually or choose a new branch name.`);
  }
}

async function createWorktree(branchName) {
  await ensureBranchDoesNotExist(branchName);
  const { worktreeParentDirName } = ensureManagedWorktreeDirectory(rootDir);
  const plan = getCreatePlan({
    branchName,
    rootDir,
    worktreeParentDirName
  });

  await runCommand("git", ["worktree", "add", plan.targetPath, "-b", branchName], {
    cwd: rootDir
  });
  copySharedDevelopmentFilesIntoWorktree(rootDir, plan.targetPath);

  console.log(`Created worktree at ${plan.targetPath}`);
  console.log("Database mode: shared (copied shared development files from the main worktree)");
}

async function cloneInfrastructureForCurrentWorktree() {
  const plan = getCloneInfraPlan({
    currentPath: currentDir
  });

  if (rootDir === currentDir) {
    throw new Error("Refusing to clone private infrastructure in the main worktree.");
  }

  if (!existsSync(plan.sourceComposePath)) {
    throw new Error(`Missing ${plan.sourceComposePath}.`);
  }

  if (existsSync(plan.composePath)) {
    throw new Error(`This worktree already has private infrastructure at ${plan.composePath}.`);
  }

  const reservedPorts = await listDockerPublishedPorts();
  const postgresPort = await selectAvailablePort(process.env.POSTGRES_PORT ?? "55432", {
    isPortAvailable,
    reservedPorts
  });
  const redisPort = await selectAvailablePort(process.env.REDIS_PORT ?? "56380", {
    isPortAvailable,
    reservedPorts: new Set([...reservedPorts, postgresPort])
  });

  copyFileSync(plan.sourceComposePath, plan.composePath);

  const existingLocalText = existsSync(plan.envLocalPath) ? readFileSync(plan.envLocalPath, "utf8") : "";
  writeFileSync(
    plan.envLocalPath,
    buildPrivateInfraEnvText(existingLocalText, {
      postgresPort,
      redisPort
    }),
    "utf8"
  );

  console.log(`Cloned private infrastructure into ${plan.composePath}.`);
  console.log(`POSTGRES_PORT=${postgresPort}`);
  console.log(`REDIS_PORT=${redisPort}`);
  console.log(`Current worktree now uses ${plan.envLocalPath}.`);
}

function getNpmCommand() {
  const npmBinaryName = process.platform === "win32" ? "npm.cmd" : "npm";
  const siblingNpm = path.join(path.dirname(process.execPath), npmBinaryName);

  if (existsSync(siblingNpm)) {
    return siblingNpm;
  }

  return npmBinaryName;
}

async function removeWorktree(target) {
  const entries = await listWorktrees();
  const selectedEntry = selectWorktreeEntry(entries, {
    currentPath: currentDir,
    target
  });
  const plan = getRemovePlan({
    currentPath: currentDir,
    targetEntry: selectedEntry,
    trackedDatabaseName: readPrivateDatabaseName(selectedEntry.path)
  });
  const { stdout } = await captureCommand("git", ["status", "--porcelain"], {
    cwd: plan.targetPath
  });

  if (stdout.trim().length > 0) {
    throw new Error(`Worktree "${plan.branchName}" has uncommitted changes. Clean it up before removing it.`);
  }

  if (plan.databaseName) {
    await dropDatabase(plan.databaseName);
  }

  await runCommand("git", ["worktree", "remove", plan.targetPath], {
    cwd: rootDir
  });
  await runCommand("git", ["branch", "-D", plan.branchName], {
    cwd: rootDir
  });

  const envLocalPath = path.join(plan.targetPath, ".env.dev.local");

  if (existsSync(envLocalPath)) {
    unlinkSync(envLocalPath);
  }

  console.log(`Removed worktree "${plan.branchName}".`);
  if (plan.databaseName) {
    console.log(`Dropped private database "${plan.databaseName}".`);
  }
}

async function main() {
  const command = parseWorktreeCommand(process.argv.slice(2));

  switch (command.command) {
    case "create":
      await createWorktree(command.branchName);
      return;
    case "cloneinfra":
      await cloneInfrastructureForCurrentWorktree();
      return;
    case "remove":
      await removeWorktree(command.target);
      return;
    default:
      throw new Error("Unknown worktree command.");
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
