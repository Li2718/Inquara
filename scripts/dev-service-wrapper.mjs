import { spawn } from "node:child_process";
import { openSync, readFileSync, writeSync } from "node:fs";
import process from "node:process";

const optionsArg = process.argv[2] ?? "{}";
const options = optionsArg.startsWith("@")
  ? JSON.parse(readFileSync(optionsArg.slice(1), "utf8"))
  : JSON.parse(optionsArg);

if (!options.command || !Array.isArray(options.args) || !options.cwd || !options.logPath) {
  console.error("Usage: node dev-service-wrapper.mjs '<json options>'");
  process.exit(1);
}

const logFd = openSync(options.logPath, "a");
const child = spawn(options.command, options.args, {
  cwd: options.cwd,
  env: {
    ...process.env,
    ...(options.env ?? {})
  },
  stdio: ["ignore", logFd, logFd],
  windowsHide: true
});

function writeLogLine(message) {
  writeSync(logFd, `${message}\n`);
}

writeLogLine(
  `[dev-service-wrapper] starting ${JSON.stringify({
    command: options.command,
    args: options.args,
    cwd: options.cwd
  })}`
);

let shuttingDown = false;

function stopChild() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (child.pid) {
    try {
      child.kill("SIGTERM");
    } catch {
      // The child may already be gone.
    }
  }
}

process.on("SIGTERM", stopChild);
process.on("SIGINT", stopChild);

child.on("error", error => {
  writeLogLine(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

child.on("exit", (code, signal) => {
  writeLogLine(
    `[dev-service-wrapper] child exited ${JSON.stringify({
      code,
      signal
    })}`
  );

  if (signal) {
    process.exit(0);
  }

  process.exit(code ?? 0);
});
