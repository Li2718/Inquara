import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../locale";
import { getMessages, messages } from "./index";

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return [prefix];
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectLeafPaths(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe("shared messages", () => {
  it("has a complete dictionary for every supported locale", () => {
    expect(Object.keys(messages).sort()).toEqual([...SUPPORTED_LOCALES].sort());
    const englishPaths = collectLeafPaths(messages.en).sort();

    for (const locale of SUPPORTED_LOCALES) {
      expect(collectLeafPaths(messages[locale]).sort()).toEqual(englishPaths);
    }
  });

  it("returns English as the source dictionary", () => {
    expect(getMessages("en").common.brand).toBe("Inquara");
    expect(getMessages("en").auth.loginAction).toBe("Log in");
  });

  it("returns localized Chinese product copy", () => {
    expect(getMessages("zh-CN").auth.loginAction).toBe("登录");
    expect(getMessages("zh-CN").workspaceSidebar.canvases).toBe("画布");
    expect(getMessages("zh-CN").canvas.askFollowUp).toBe("继续追问");
  });
});
