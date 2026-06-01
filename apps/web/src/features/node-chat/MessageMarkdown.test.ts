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

  it("renders task lists with checkbox affordances", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "- [x] done item\n- [ ] pending item",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("task-list");
    expect(html).toContain("task-checkbox");
    expect(html).toContain("aria-checked=\"true\"");
    expect(html).toContain("pending item");
  });

  it("renders strikethrough instead of leaving double tildes raw", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "before ~~removed~~ after",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("<del>");
    expect(html).toContain("removed");
    expect(html).not.toContain("~~removed~~");
  });

  it("renders markdown images as img tags", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "![diagram](https://example.com/diagram.png)",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("<img");
    expect(html).toContain("src=\"https://example.com/diagram.png\"");
    expect(html).toContain("alt=\"diagram\"");
  });

  it("renders thematic breaks for triple dash lines", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "first\n\n---\n\nsecond",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("<hr");
  });

  it("does not leave block math fence syntax raw", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "\\[ S=\\\\sum_{k=1}^{n} x_k \\]",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).not.toContain("\\[");
    expect(html).not.toContain("\\]");
    expect(html).toContain("katex");
    expect(html).toContain("katex-html");
  });

  it("does not leave double-dollar block math syntax raw", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "$$\nE = mc^2\n$$",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).not.toContain("$$");
    expect(html).toContain("E = mc^2");
    expect(html).toContain("katex-display");
  });

  it("renders inline math without exposing raw delimiters", () => {
    const html = renderToStaticMarkup(
      createElement(MessageMarkdown, {
        content: "Use $E = mc^2$ in the explanation.",
        branches: [],
        onToggleBranch: vi.fn()
      })
    );

    expect(html).toContain("E = mc^2");
    expect(html).not.toContain("$E = mc^2$");
    expect(html).toContain("katex");
  });
});
