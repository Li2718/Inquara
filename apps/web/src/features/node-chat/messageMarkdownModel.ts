export type MarkdownBranch = {
  id: string;
  hiddenAt: string | null;
  sourceRangeStart: number | null;
  sourceRangeEnd: number | null;
};

export type MarkdownTextToken = {
  type: "text";
  text: string;
  sourceStart: number;
  sourceEnd: number;
};

export type MarkdownInlineToken = {
  type: "strong" | "emphasis" | "inlineCode" | "link";
  children: MarkdownToken[];
  sourceStart: number;
  sourceEnd: number;
  href?: string;
};

export type MarkdownToken = MarkdownTextToken | MarkdownInlineToken;

export type MarkdownBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4 | 5 | 6;
      tokens: MarkdownToken[];
      sourceStart: number;
      sourceEnd: number;
    }
  | {
      type: "paragraph";
      tokens: MarkdownToken[];
      sourceStart: number;
      sourceEnd: number;
    }
  | {
      type: "table";
      header: {
        tokens: MarkdownToken[];
        sourceStart: number;
        sourceEnd: number;
      }[];
      rows: {
        cells: {
          tokens: MarkdownToken[];
          sourceStart: number;
          sourceEnd: number;
        }[];
        sourceStart: number;
        sourceEnd: number;
      }[];
      sourceStart: number;
      sourceEnd: number;
    }
  | {
      type: "list";
      ordered: boolean;
      items: {
        tokens: MarkdownToken[];
        sourceStart: number;
        sourceEnd: number;
      }[];
      sourceStart: number;
      sourceEnd: number;
    }
  | {
      type: "codeFence";
      language: string;
      code: string;
      codeSourceStart: number;
      codeSourceEnd: number;
      sourceStart: number;
      sourceEnd: number;
    }
  | {
      type: "blockquote";
      tokens: MarkdownToken[];
      sourceStart: number;
      sourceEnd: number;
    };

type LineInfo = {
  text: string;
  start: number;
  end: number;
  hasTrailingNewline: boolean;
};

export function parseMessageMarkdown(content: string): MarkdownBlock[] {
  const lines = splitLines(content);
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line) break;
    if (line.text.trim().length === 0) {
      index += 1;
      continue;
    }

    const fenceMatch = line.text.match(/^```([^\n`]*)\s*$/u);
    if (fenceMatch) {
      const language = fenceMatch[1]?.trim() ?? "";
      const start = line.start;
      let code = "";
      const codeSourceStart = line.end + (line.hasTrailingNewline ? 1 : 0);
      let codeSourceEnd = codeSourceStart;
      let end = line.end;
      index += 1;
      while (index < lines.length) {
        const codeLine = lines[index];
        if (!codeLine) break;
        if (/^```/u.test(codeLine.text)) {
          end = codeLine.end;
          index += 1;
          break;
        }
        code += codeLine.text;
        if (codeLine.hasTrailingNewline) code += "\n";
        codeSourceEnd = codeLine.end + (codeLine.hasTrailingNewline ? 1 : 0);
        end = codeLine.end;
        index += 1;
      }
      blocks.push({
        type: "codeFence",
        language,
        code,
        codeSourceStart,
        codeSourceEnd,
        sourceStart: start,
        sourceEnd: end
      });
      continue;
    }

    const headingMatch = line.text.match(/^(#{1,6})\s+(.*)$/u);
    if (headingMatch) {
      const hashes = headingMatch[1] ?? "#";
      const bodyStart = line.start + hashes.length + 1;
      blocks.push({
        type: "heading",
        level: hashes.length as 1 | 2 | 3 | 4 | 5 | 6,
        tokens: parseInlineTokens(headingMatch[2] ?? "", bodyStart),
        sourceStart: line.start,
        sourceEnd: line.end
      });
      index += 1;
      continue;
    }

    if (isTableHeaderLine(line.text) && index + 1 < lines.length && isTableDividerLine(lines[index + 1]?.text ?? "")) {
      const start = line.start;
      const header = parseTableRow(line.text, line.start);
      let end = lines[index + 1]?.end ?? line.end;
      index += 2;
      const rows: {
        cells: {
          tokens: MarkdownToken[];
          sourceStart: number;
          sourceEnd: number;
        }[];
        sourceStart: number;
        sourceEnd: number;
      }[] = [];

      while (index < lines.length) {
        const rowLine = lines[index];
        if (!rowLine || !isTableRowLine(rowLine.text)) break;
        rows.push({
          cells: parseTableRow(rowLine.text, rowLine.start),
          sourceStart: rowLine.start,
          sourceEnd: rowLine.end
        });
        end = rowLine.end;
        index += 1;
      }

      blocks.push({
        type: "table",
        header,
        rows,
        sourceStart: start,
        sourceEnd: end
      });
      continue;
    }

    if (/^\s*[-*]\s+/u.test(line.text) || /^\s*\d+\.\s+/u.test(line.text)) {
      const ordered = /^\s*\d+\.\s+/u.test(line.text);
      const items: { tokens: MarkdownToken[]; sourceStart: number; sourceEnd: number }[] = [];
      const start = line.start;
      let end = line.end;

      while (index < lines.length) {
        const itemLine = lines[index];
        if (!itemLine || itemLine.text.trim().length === 0) break;
        const markerMatch = itemLine.text.match(ordered ? /^(\s*\d+\.\s+)(.*)$/u : /^(\s*[-*]\s+)(.*)$/u);
        if (!markerMatch) break;
        const prefix = markerMatch[1] ?? "";
        const body = markerMatch[2] ?? "";
        items.push({
          tokens: parseInlineTokens(body, itemLine.start + prefix.length),
          sourceStart: itemLine.start,
          sourceEnd: itemLine.end
        });
        end = itemLine.end;
        index += 1;
      }

      blocks.push({
        type: "list",
        ordered,
        items,
        sourceStart: start,
        sourceEnd: end
      });
      continue;
    }

    if (/^>\s?/u.test(line.text)) {
      const start = line.start;
      const parts: string[] = [];
      let end = line.end;
      while (index < lines.length) {
        const quoteLine = lines[index];
        if (!quoteLine || !/^>\s?/u.test(quoteLine.text)) break;
        parts.push(quoteLine.text.replace(/^>\s?/u, ""));
        end = quoteLine.end;
        index += 1;
      }
      const quoteText = parts.join("\n");
      blocks.push({
        type: "blockquote",
        tokens: parseInlineTokens(quoteText, start + 2),
        sourceStart: start,
        sourceEnd: end
      });
      continue;
    }

    const start = line.start;
    const paragraphLines: LineInfo[] = [];
    let end = line.end;
    while (index < lines.length) {
      const paragraphLine = lines[index];
      if (!paragraphLine || paragraphLine.text.trim().length === 0) break;
      if (
        /^```/u.test(paragraphLine.text) ||
        /^(#{1,6})\s+/u.test(paragraphLine.text) ||
        /^\s*[-*]\s+/u.test(paragraphLine.text) ||
        /^\s*\d+\.\s+/u.test(paragraphLine.text) ||
        /^>\s?/u.test(paragraphLine.text)
      ) {
        if (paragraphLines.length > 0) break;
      }
      paragraphLines.push(paragraphLine);
      end = paragraphLine.end;
      index += 1;
    }
    const paragraphText = paragraphLines
      .map(item => item.text)
      .join("\n");
    blocks.push({
      type: "paragraph",
      tokens: parseInlineTokens(paragraphText, start),
      sourceStart: start,
      sourceEnd: end
    });
  }

  return blocks;
}

function splitLines(content: string): LineInfo[] {
  const lines: LineInfo[] = [];
  let start = 0;

  for (let index = 0; index <= content.length; index += 1) {
    const char = content[index];
    if (char !== "\n" && index !== content.length) continue;
    const end = index;
    lines.push({
      text: content.slice(start, end),
      start,
      end,
      hasTrailingNewline: char === "\n"
    });
    start = index + 1;
  }

  if (content.length === 0) {
    lines.push({
      text: "",
      start: 0,
      end: 0,
      hasTrailingNewline: false
    });
  }

  return lines;
}

function isTableHeaderLine(text: string): boolean {
  return isTableRowLine(text);
}

function isTableDividerLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.includes("|")) return false;
  const cells = splitTableCells(trimmed);
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/u.test(cell.trim()));
}

function isTableRowLine(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  return splitTableCells(trimmed).length > 0;
}

function parseTableRow(
  text: string,
  rowSourceStart: number
): {
  tokens: MarkdownToken[];
  sourceStart: number;
  sourceEnd: number;
}[] {
  const cells = splitTableCells(text);
  const result: {
    tokens: MarkdownToken[];
    sourceStart: number;
    sourceEnd: number;
  }[] = [];

  let searchOffset = 0;
  for (const rawCell of cells) {
    const tokenStart = text.indexOf(rawCell, searchOffset);
    const sourceStart = rowSourceStart + Math.max(0, tokenStart);
    const sourceEnd = sourceStart + rawCell.length;
    const cellText = rawCell.trim();
    const leadingWhitespace = rawCell.length - rawCell.trimStart().length;
    result.push({
      tokens: parseInlineTokens(cellText, sourceStart + leadingWhitespace),
      sourceStart,
      sourceEnd
    });
    searchOffset = Math.max(searchOffset, tokenStart + rawCell.length + 1);
  }

  return result;
}

function splitTableCells(text: string): string[] {
  return text
    .trim()
    .replace(/^\|/u, "")
    .replace(/\|$/u, "")
    .split("|");
}

function parseInlineTokens(text: string, sourceOffset: number): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.startsWith("**", cursor)) {
      const closing = text.indexOf("**", cursor + 2);
      if (closing > cursor + 2) {
        tokens.push({
          type: "strong",
          children: parseInlineTokens(text.slice(cursor + 2, closing), sourceOffset + cursor + 2),
          sourceStart: sourceOffset + cursor,
          sourceEnd: sourceOffset + closing + 2
        });
        cursor = closing + 2;
        continue;
      }
    }

    if (text[cursor] === "*" || text[cursor] === "_") {
      const marker = text[cursor] ?? "*";
      const closing = text.indexOf(marker, cursor + 1);
      if (closing > cursor + 1) {
        tokens.push({
          type: "emphasis",
          children: parseInlineTokens(text.slice(cursor + 1, closing), sourceOffset + cursor + 1),
          sourceStart: sourceOffset + cursor,
          sourceEnd: sourceOffset + closing + 1
        });
        cursor = closing + 1;
        continue;
      }
    }

    if (text[cursor] === "`") {
      const closing = text.indexOf("`", cursor + 1);
      if (closing > cursor + 1) {
        tokens.push({
          type: "inlineCode",
          children: [
            {
              type: "text",
              text: text.slice(cursor + 1, closing),
              sourceStart: sourceOffset + cursor + 1,
              sourceEnd: sourceOffset + closing
            }
          ],
          sourceStart: sourceOffset + cursor,
          sourceEnd: sourceOffset + closing + 1
        });
        cursor = closing + 1;
        continue;
      }
    }

    if (text[cursor] === "[") {
      const labelEnd = text.indexOf("]", cursor + 1);
      const openParen = labelEnd >= 0 ? text.indexOf("(", labelEnd) : -1;
      const closeParen = openParen >= 0 ? text.indexOf(")", openParen) : -1;
      if (labelEnd > cursor + 1 && openParen === labelEnd + 1 && closeParen > openParen + 1) {
        tokens.push({
          type: "link",
          children: parseInlineTokens(text.slice(cursor + 1, labelEnd), sourceOffset + cursor + 1),
          href: text.slice(openParen + 1, closeParen),
          sourceStart: sourceOffset + cursor,
          sourceEnd: sourceOffset + closeParen + 1
        });
        cursor = closeParen + 1;
        continue;
      }
    }

    let next = cursor + 1;
    while (next < text.length) {
      const nextChar = text[next] ?? "";
      const nextTwo = text.slice(next, next + 2);
      if (nextTwo === "**" || nextChar === "*" || nextChar === "_" || nextChar === "`" || nextChar === "[") break;
      next += 1;
    }
    tokens.push({
      type: "text",
      text: text.slice(cursor, next),
      sourceStart: sourceOffset + cursor,
      sourceEnd: sourceOffset + next
    });
    cursor = next;
  }

  return mergeAdjacentTextTokens(tokens);
}

function mergeAdjacentTextTokens(tokens: MarkdownToken[]): MarkdownToken[] {
  const merged: MarkdownToken[] = [];

  for (const token of tokens) {
    const last = merged[merged.length - 1];
    if (last?.type === "text" && token.type === "text" && last.sourceEnd === token.sourceStart) {
      last.text += token.text;
      last.sourceEnd = token.sourceEnd;
      continue;
    }
    merged.push(token);
  }

  return merged;
}
