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
    expect(getMessages("zh-CN").canvasSidebar.canvases).toBe("画布");
    expect(getMessages("zh-CN").canvas.askFollowUp).toBe("继续追问");
  });

  it("puts unstable network recovery copy in the expected hierarchy", () => {
    expect(getMessages("zh-CN").lease.recoveringEyebrow).toBe("正在恢复连接");
    expect(getMessages("zh-CN").lease.recoveringTitle).toBe("网络连接不稳定");
    expect(getMessages("zh-CN").lease.unstableNetworkMessage).toBe("恢复完成前，编辑会暂停；未同步的修改可能无效。");

    expect(getMessages("en").lease.recoveringEyebrow).toBe("Restoring connection");
    expect(getMessages("en").lease.recoveringTitle).toBe("Network connection is unstable");
    expect(getMessages("en").lease.unstableNetworkMessage).toBe(
      "Editing pauses until the connection recovers. Unsynced changes may not apply."
    );
  });

  it("explains active elsewhere as a single-editor rule instead of stale visible content", () => {
    expect(getMessages("zh-CN").lease.defaultMessage).toBe("同一画布一次只能由一个客户端编辑。接管编辑后，其他客户端会停止编辑。");
    expect(getMessages("en").lease.defaultMessage).toBe(
      "Only one client can edit a canvas at a time. Taking over editing will stop editing in the other client."
    );
  });
});
