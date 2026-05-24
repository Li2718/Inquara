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
