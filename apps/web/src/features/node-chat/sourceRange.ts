export function findSourceRange(content: string, selectedText: string): { start: number; end: number } | null {
  const target = selectedText.replace(/\s+/g, " ").trim();
  if (!target) return null;

  for (let start = 0; start < content.length; start += 1) {
    let contentIndex = start;
    let targetIndex = 0;
    while (contentIndex < content.length && targetIndex < target.length) {
      const contentChar = content[contentIndex] ?? "";
      const targetChar = target[targetIndex] ?? "";
      if (/\s/.test(targetChar)) {
        if (!/\s/.test(contentChar)) break;
        while (contentIndex < content.length && /\s/.test(content[contentIndex] ?? "")) contentIndex += 1;
        while (targetIndex < target.length && /\s/.test(target[targetIndex] ?? "")) targetIndex += 1;
        continue;
      }
      if (contentChar !== targetChar) break;
      contentIndex += 1;
      targetIndex += 1;
    }
    if (targetIndex === target.length) return { start, end: contentIndex };
  }

  return null;
}

export function getTextRangeInElement(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: TextRangeNode[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    textNodes.push({
      id: node,
      length: node.textContent?.length ?? 0
    });
  }

  return getTextRangeFromTextNodes(textNodes, {
    startNode: range.startContainer,
    startOffset: range.startOffset,
    endNode: range.endContainer,
    endOffset: range.endOffset
  });
}

export function getSourceRangeInElement(root: HTMLElement, range: Range): { start: number; end: number } | null {
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: SourceTextRangeNode[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const sourceElement = node.parentElement?.closest<HTMLElement>("[data-source-start][data-source-end]");
    const sourceStartValue = sourceElement?.getAttribute("data-source-start");
    const sourceEndValue = sourceElement?.getAttribute("data-source-end");
    const sourceStart = sourceStartValue === null || sourceStartValue === undefined ? Number.NaN : Number(sourceStartValue);
    const sourceEnd = sourceEndValue === null || sourceEndValue === undefined ? Number.NaN : Number(sourceEndValue);
    if (!Number.isFinite(sourceStart) || !Number.isFinite(sourceEnd)) continue;
    textNodes.push({
      id: node,
      owner: sourceElement,
      length: node.textContent?.length ?? 0,
      sourceStart,
      sourceEnd,
      offsetMode: sourceElement?.getAttribute("data-source-offset-mode") === "container" ? "container" : "text"
    });
  }

  return getSourceRangeFromTextNodes(textNodes, {
    startNode: range.startContainer,
    startOffset: range.startOffset,
    endNode: range.endContainer,
    endOffset: range.endOffset
  });
}

export function getRangeContainerElement(container: {
  nodeType: number;
  parentElement?: Element | null;
} | null): Element | null {
  if (!container) return null;
  return container.nodeType === 1 ? (container as Element) : (container.parentElement ?? null);
}

type TextRangeNode = {
  id: unknown;
  owner?: unknown;
  length: number;
};

type SourceTextRangeNode = TextRangeNode & {
  sourceStart: number;
  sourceEnd: number;
  offsetMode?: "text" | "container";
};

export function getTextRangeFromTextNodes(
  textNodes: TextRangeNode[],
  selection: {
    startNode: unknown;
    startOffset: number;
    endNode: unknown;
    endOffset: number;
  }
): { start: number; end: number } | null {
  let offset = 0;
  let start: number | null = null;
  let end: number | null = null;

  for (const node of textNodes) {
    if (node.id === selection.startNode) start = offset + selection.startOffset;
    if (node.id === selection.endNode) {
      end = offset + selection.endOffset;
      break;
    }
    offset += node.length;
  }

  if (start === null || end === null || end < start) return null;
  return { start, end };
}

export function getSourceRangeFromTextNodes(
  textNodes: SourceTextRangeNode[],
  selection: {
    startNode: unknown;
    startOffset: number;
    endNode: unknown;
    endOffset: number;
  }
): { start: number; end: number } | null {
  let start: number | null = null;
  let end: number | null = null;

  for (const node of textNodes) {
    if (node.id === selection.startNode || node.owner === selection.startNode) {
      start = node.offsetMode === "container" ? node.sourceStart : Math.min(node.sourceEnd, node.sourceStart + selection.startOffset);
    }
    if (node.id === selection.endNode || node.owner === selection.endNode) {
      end = node.offsetMode === "container" ? node.sourceEnd : Math.min(node.sourceEnd, node.sourceStart + selection.endOffset);
      break;
    }
  }

  if (start === null || end === null || end < start) return null;
  return { start, end };
}
