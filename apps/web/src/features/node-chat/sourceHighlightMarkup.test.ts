import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("source highlight markup", () => {
  it("uses inline text markup instead of a native button inside message copy", () => {
    const source = readFileSync("apps/web/src/features/node-chat/MessageList.tsx", "utf8");

    expect(source).not.toMatch(/<button[\s\S]*className="source-highlight"/);
    expect(source).toMatch(/<span[\s\S]*role="button"[\s\S]*className="source-highlight"/);
  });
});
