import { spawn } from "node:child_process";

const processes = [
  spawnWorkspace("@inquara/api", "dev"),
  spawnWorkspace("@inquara/web", "dev")
];

let shuttingDown = false;

for (const child of processes) {
  child.on("exit", (code, signal) => {
    if (shuttingDown) return;
    if (code === 0 || signal) return;
    shuttingDown = true;
    for (const other of processes) {
      if (other !== child && !other.killed) other.kill();
    }
    process.exit(code ?? 1);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

function shutdown(signal) {
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) child.kill(signal);
  }
}

function spawnWorkspace(workspace, scriptName) {
  const args = ["--workspace", workspace, "run", scriptName];
  if (process.env.npm_execpath) {
    return spawn(process.execPath, [process.env.npm_execpath, ...args], {
      stdio: "inherit",
      env: process.env
    });
  }
  return spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, {
    stdio: "inherit",
    env: process.env
  });
}
