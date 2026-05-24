export type RectLike = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

export function getLastVisibleSelectionRect(rects: RectLike[]): RectLike | null {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    const rect = rects[index];
    if (rect && rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

export function toScrollableLocalPoint(input: {
  containerClientHeight: number;
  containerClientWidth: number;
  containerRect: RectLike;
  scrollLeft: number;
  scrollTop: number;
  selectionRect: RectLike;
}): { x: number; y: number } {
  const scaleX = input.containerRect.width / input.containerClientWidth || 1;
  const scaleY = input.containerRect.height / input.containerClientHeight || 1;

  return {
    x: (input.selectionRect.right - input.containerRect.left) / scaleX + input.scrollLeft,
    y: (input.selectionRect.bottom - input.containerRect.top) / scaleY + input.scrollTop
  };
}

export function toViewportToolbarPoint(input: {
  selectionRect: RectLike;
  viewportHeight: number;
  viewportWidth: number;
}): { x: number; y: number } {
  const estimatedToolbarWidth = 180;
  const estimatedToolbarHeight = 44;
  const gap = 4;
  const margin = 12;
  const desiredX = input.selectionRect.right - 12;
  const desiredY = input.selectionRect.bottom + gap;
  const fallbackY = input.selectionRect.top - estimatedToolbarHeight - gap;

  return {
    x: Math.min(Math.max(desiredX, margin), input.viewportWidth - estimatedToolbarWidth - margin),
    y:
      desiredY + estimatedToolbarHeight <= input.viewportHeight - margin
        ? desiredY
        : Math.max(fallbackY, margin)
  };
}
