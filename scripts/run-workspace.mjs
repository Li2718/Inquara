import { spawn } from "node:child_process";

const [workspace, scriptName, ...scriptArgs] = process.argv.slice(2);

if (!workspace || !scriptName) {
  console.error("Usage: node scripts/run-workspace.mjs <workspace> <script> [...args]");
  process.exit(1);
}

const child = spawnNpm(["--workspace", workspace, "run", scriptName, ...scriptArgs], {
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

function spawnNpm(args, options) {
  if (process.env.npm_execpath) {
    return spawn(process.execPath, [process.env.npm_execpath, ...args], options);
  }
  return spawn(process.platform === "win32" ? "npm.cmd" : "npm", args, options);
}
