import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, "apps", "web", ".next");
const forbiddenMarkers = [
  "INQUARA_DEBUG_PANEL",
  "Canvas session debug",
  "DebugFloatingButton",
  "debug-floating-button",
  "INQUARA DEBUG"
];

if (!existsSync(nextDir)) {
  console.error("Missing apps/web/.next. Run the production web build before verify:debug-free.");
  process.exit(1);
}

const offenders = [];

function scan(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(path)) {
      scan(join(path, entry));
    }
    return;
  }

  if (path.endsWith(".nft.json")) return;
  if (!/\.(js|mjs|json|html|txt|rsc|map)$/.test(path)) return;
  const text = readFileSync(path, "utf8");
  for (const marker of forbiddenMarkers) {
    if (text.includes(marker)) offenders.push({ path, marker });
  }
}

scan(nextDir);

if (offenders.length > 0) {
  console.error("Production build contains debug markers:");
  for (const offender of offenders) {
    console.error(`- ${offender.marker} in ${offender.path}`);
  }
  process.exit(1);
}

console.log("Production build is debug-free.");
