import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const schema = readFileSync(resolve(import.meta.dirname, "../prisma/schema.prisma"), "utf8");

describe("Prisma schema", () => {
  it("does not add speculative node type or generic payload fields", () => {
    const canvasNodeModel = schema.match(/model CanvasNode \{[\s\S]*?\n\}/)?.[0] ?? "";

    expect(canvasNodeModel).not.toMatch(/\btype\s+/);
    expect(canvasNodeModel).not.toMatch(/\bdata\s+/);
    expect(canvasNodeModel).not.toMatch(/\bpayload\s+Json\b/);
  });
});
