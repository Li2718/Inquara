import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatDateTime, formatPercent } from "./index";

describe("shared formatters", () => {
  it("formats counts with the requested locale", () => {
    expect(formatCount("en", 12345)).toBe("12,345");
    expect(formatCount("zh-CN", 12345)).toBe("12,345");
  });

  it("formats percentages with the requested locale", () => {
    expect(formatPercent("en", 0.125)).toBe("12.5%");
    expect(formatPercent("zh-CN", 0.125)).toBe("12.5%");
  });

  it("formats dates and datetimes without page-local Intl construction", () => {
    expect(formatDate("en", "2026-06-02T03:04:05.000Z", "UTC")).toBe("Jun 2, 2026");
    expect(formatDate("zh-CN", "2026-06-02T03:04:05.000Z", "UTC")).toBe("2026年6月2日");
    expect(formatDateTime("en", "2026-06-02T03:04:05.000Z", "UTC")).toContain("Jun 2, 2026");
    expect(formatDateTime("zh-CN", "2026-06-02T03:04:05.000Z", "UTC")).toContain("2026年6月2日");
  });
});
