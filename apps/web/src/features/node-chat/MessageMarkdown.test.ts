import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MessageMarkdown } from "./MessageMarkdown";

describe("MessageMarkdown", () => {
  it("renders common markdown structure for node chat messages", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "### Plan\n\n- **Bold** item\n- `npm test`\n\n```ts\nconst answer = 42;\n```",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("<h3");
    expect(html).toContain("Plan");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>");
    expect(html).toContain("Bold");
    expect(html).toContain("<code");
    expect(html).toContain("npm test");
    expect(html).toContain("<pre>");
    expect(html).toContain("const answer = 42;");
  });

  it("keeps branch highlights aligned to visible markdown content", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "**hello** world",
        branches: [
          {
            id: "branch-1",
            hiddenAt: null,
            sourceRangeStart: 2,
            sourceRangeEnd: 7
          }
        ],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("source-highlight");
    expect(html).toContain(">hello<");
    expect(html).not.toContain(">**hello**<");
  });

  it("renders markdown tables instead of leaving pipe syntax raw", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content:
          "| 排序角度 | 大致排序 |\n| --- | --- |\n| 文学艺术成就 | 《红楼梦》 > 《西游记》 |\n| 通俗阅读趣味 | 《西游记》 > 《三国演义》 |",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("<table");
    expect(html).toContain("<thead");
    expect(html).toContain("<tbody");
    expect(html).toContain("<th");
    expect(html).toContain("排序角度");
    expect(html).toContain("文学艺术成就");
    expect(html).not.toContain("| --- | --- |");
  });
});
