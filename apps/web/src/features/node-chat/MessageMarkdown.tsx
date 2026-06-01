"use client";

import type { CanvasNode } from "@inquara/domain";
import React, { Fragment, type ReactNode } from "react";
import { parseMessageMarkdown, type MarkdownBlock, type MarkdownBranch, type MarkdownToken } from "./messageMarkdownModel";

type MessageMarkdownProps = {
  content: string;
  branches: Pick<CanvasNode, "id" | "hiddenAt" | "sourceRangeStart" | "sourceRangeEnd">[];
  onToggleBranch(node: CanvasNode): void;
};

export function MessageMarkdown({ content, branches, onToggleBranch }: MessageMarkdownProps) {
  const blocks = parseMessageMarkdown(content);
  const relevantBranches = [...branches]
    .filter(branch => branch.sourceRangeStart !== null && branch.sourceRangeEnd !== null)
    .sort((left, right) => (left.sourceRangeStart ?? 0) - (right.sourceRangeStart ?? 0));

  return (
    <>
      {blocks.map((block, index) => (
        <Fragment key={`${block.type}-${block.sourceStart}-${index}`}>{renderBlock(block, relevantBranches, onToggleBranch)}</Fragment>
      ))}
    </>
  );
}

function renderBlock(
  block: MarkdownBlock,
  branches: MarkdownBranch[],
  onToggleBranch: (node: CanvasNode) => void
): ReactNode {
  switch (block.type) {
    case "heading": {
      const Tag = `h${block.level}` as const;
      return <Tag>{renderTokens(block.tokens, branches, onToggleBranch)}</Tag>;
    }
    case "paragraph":
      return <p>{renderTokens(block.tokens, branches, onToggleBranch)}</p>;
    case "blockquote":
      return <blockquote>{renderTokens(block.tokens, branches, onToggleBranch)}</blockquote>;
    case "table":
      return (
        <table>
          <thead>
            <tr>
              {block.header.map(cell => (
                <th key={`${cell.sourceStart}-${cell.sourceEnd}`}>{renderTokens(cell.tokens, branches, onToggleBranch)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map(row => (
              <tr key={`${row.sourceStart}-${row.sourceEnd}`}>
                {row.cells.map(cell => (
                  <td key={`${cell.sourceStart}-${cell.sourceEnd}`}>{renderTokens(cell.tokens, branches, onToggleBranch)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "list":
      return block.ordered ? (
        <ol>
          {block.items.map(item => (
            <li key={`${item.sourceStart}-${item.sourceEnd}`}>{renderTokens(item.tokens, branches, onToggleBranch)}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {block.items.map(item => (
            <li key={`${item.sourceStart}-${item.sourceEnd}`}>{renderTokens(item.tokens, branches, onToggleBranch)}</li>
          ))}
        </ul>
      );
    case "codeFence":
      return (
        <pre>
          <code data-source-start={block.codeSourceStart} data-source-end={block.codeSourceEnd}>
            {block.code}
          </code>
        </pre>
      );
    default:
      return null;
  }
}

function renderTokens(
  tokens: MarkdownToken[],
  branches: MarkdownBranch[],
  onToggleBranch: (node: CanvasNode) => void
): ReactNode[] {
  const rendered: ReactNode[] = [];

  for (const token of tokens) {
    const overlapping = branches.filter(branch => {
      const start = branch.sourceRangeStart ?? -1;
      const end = branch.sourceRangeEnd ?? -1;
      return start < token.sourceEnd && end > token.sourceStart;
    });

    if (token.type === "text") {
      rendered.push(...renderTextWithHighlights(token.text, token.sourceStart, overlapping, onToggleBranch));
      continue;
    }

    const children = renderTokens(token.children, branches, onToggleBranch);
    const key = `${token.type}-${token.sourceStart}-${token.sourceEnd}`;
    switch (token.type) {
      case "strong":
        rendered.push(<strong key={key}>{children}</strong>);
        break;
      case "emphasis":
        rendered.push(<em key={key}>{children}</em>);
        break;
      case "inlineCode":
        rendered.push(
          <code key={key} data-source-start={token.sourceStart} data-source-end={token.sourceEnd}>
            {children}
          </code>
        );
        break;
      case "link":
        rendered.push(
          <a
            key={key}
            href={token.href}
            target="_blank"
            rel="noreferrer"
          >
            {children}
          </a>
        );
        break;
    }
  }

  return rendered;
}

function renderTextWithHighlights(
  text: string,
  sourceStart: number,
  branches: MarkdownBranch[],
  onToggleBranch: (node: CanvasNode) => void
): ReactNode[] {
  if (branches.length === 0) {
    return [createSourceSpan(`text-${sourceStart}-${text.length}`, text, sourceStart, sourceStart + text.length)];
  }

  const parts: ReactNode[] = [];
  let cursor = 0;

  for (const branch of branches) {
    const branchStart = Math.max(0, (branch.sourceRangeStart ?? sourceStart) - sourceStart);
    const branchEnd = Math.min(text.length, (branch.sourceRangeEnd ?? sourceStart + text.length) - sourceStart);
    if (branchEnd <= branchStart || branchStart < cursor) continue;

    if (cursor < branchStart) {
      const before = text.slice(cursor, branchStart);
      parts.push(createSourceSpan(`${sourceStart}-before-${cursor}`, before, sourceStart + cursor, sourceStart + branchStart));
    }

    const highlightedText = text.slice(branchStart, branchEnd);
    parts.push(
      <span
        key={branch.id}
        role="button"
        tabIndex={0}
        className="source-highlight"
        data-hidden={branch.hiddenAt ? "true" : "false"}
        data-source-start={sourceStart + branchStart}
        data-source-end={sourceStart + branchEnd}
        onMouseDown={event => {
          if (event.detail > 1) event.preventDefault();
        }}
        onClick={() => onToggleBranch(branch as CanvasNode)}
        onDoubleClick={event => {
          event.preventDefault();
          window.getSelection()?.removeAllRanges();
        }}
        onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onToggleBranch(branch as CanvasNode);
        }}
      >
        {createSourceSpan(`${branch.id}-text`, highlightedText, sourceStart + branchStart, sourceStart + branchEnd)}
      </span>
    );
    cursor = branchEnd;
  }

  if (cursor < text.length) {
    parts.push(createSourceSpan(`${sourceStart}-tail-${cursor}`, text.slice(cursor), sourceStart + cursor, sourceStart + text.length));
  }

  return parts;
}

function createSourceSpan(key: string, text: string, start: number, end: number) {
  if (text.length === 0) return null;
  return (
    <span key={key} data-source-start={start} data-source-end={end}>
      {text}
    </span>
  );
}
