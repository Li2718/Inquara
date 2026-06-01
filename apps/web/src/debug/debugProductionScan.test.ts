import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function listProductSourceFiles(root: string): string[] {
  const entries = readdirSync(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entryPath === path.join("apps", "web", "src", "debug")) continue;
      files.push(...listProductSourceFiles(entryPath));
      continue;
    }

    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files;
}

describe("debug production safety", () => {
  it("keeps product modules from importing development-only debug modules directly", () => {
    const productFiles = listProductSourceFiles(path.join("apps", "web", "src"));

    const offenders = productFiles.filter(file => readFileSync(file, "utf8").includes(".dev"));

    expect(offenders).toEqual([]);
  });
});
