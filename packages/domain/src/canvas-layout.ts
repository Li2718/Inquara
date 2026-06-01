import type { CanvasNode } from "./schemas";

const ORGANIZE_HORIZONTAL_GAP = 64;
const ORGANIZE_VERTICAL_GAP = 64;
const ORGANIZE_TOP_PADDING = 120;

type Point = {
  x: number;
  y: number;
};

type LayoutResult = {
  bottom: number;
  top: number;
};

export function calculateOrganizedNodePositions(nodes: CanvasNode[]): Map<string, Point> {
  const visibleNodes = nodes.filter(node => !node.hiddenAt && !node.deletedAt);
  const nodesById = new Map(visibleNodes.map(node => [node.id, node]));
  const childrenByParent = new Map<string, CanvasNode[]>();

  for (const node of visibleNodes) {
    if (!node.parentNodeId || !nodesById.has(node.parentNodeId)) continue;
    childrenByParent.set(node.parentNodeId, [...(childrenByParent.get(node.parentNodeId) ?? []), node]);
  }

  for (const children of childrenByParent.values()) {
    children.sort(compareNodesForLayout);
  }

  const roots = visibleNodes
    .filter(node => !node.parentNodeId || !nodesById.has(node.parentNodeId))
    .sort(compareNodesForLayout);

  const positions = new Map<string, Point>();
  let nextRootTop = ORGANIZE_TOP_PADDING;

  for (const root of roots) {
    const levelXs = calculateLevelXs(root, childrenByParent);
    const result = layoutNode(root, levelXs, nextRootTop, childrenByParent, positions);
    nextRootTop = result.bottom + ORGANIZE_VERTICAL_GAP;
  }

  return positions;
}

function calculateLevelXs(root: CanvasNode, childrenByParent: Map<string, CanvasNode[]>): number[] {
  const widthsByDepth: number[] = [];
  collectMaxWidthsByDepth(root, childrenByParent, widthsByDepth);

  const levelXs = [root.x];
  for (let depth = 1; depth < widthsByDepth.length; depth += 1) {
    levelXs[depth] = (levelXs[depth - 1] ?? root.x) + (widthsByDepth[depth - 1] ?? root.width) + ORGANIZE_HORIZONTAL_GAP;
  }
  return levelXs;
}

function collectMaxWidthsByDepth(
  node: CanvasNode,
  childrenByParent: Map<string, CanvasNode[]>,
  widthsByDepth: number[],
  depth = 0
) {
  widthsByDepth[depth] = Math.max(widthsByDepth[depth] ?? 0, node.width);
  for (const child of childrenByParent.get(node.id) ?? []) {
    collectMaxWidthsByDepth(child, childrenByParent, widthsByDepth, depth + 1);
  }
}

function layoutNode(
  node: CanvasNode,
  levelXs: number[],
  topY: number,
  childrenByParent: Map<string, CanvasNode[]>,
  positions: Map<string, Point>,
  depth = 0
): LayoutResult {
  const children = childrenByParent.get(node.id) ?? [];
  const x = levelXs[depth] ?? node.x;

  if (children.length === 0) {
    positions.set(node.id, { x, y: topY });
    return { top: topY, bottom: topY + node.height };
  }

  let currentTop = topY;
  const childResults: LayoutResult[] = [];
  for (const child of children) {
    const childResult = layoutNode(child, levelXs, currentTop, childrenByParent, positions, depth + 1);
    childResults.push(childResult);
    currentTop = childResult.bottom + ORGANIZE_VERTICAL_GAP;
  }

  const firstChild = childResults[0];
  const lastChild = childResults[childResults.length - 1];
  const childrenTop = firstChild?.top ?? topY;
  const childrenBottom = lastChild?.bottom ?? topY + node.height;
  const y = Math.round((childrenTop + childrenBottom - node.height) / 2);

  positions.set(node.id, { x, y });

  return {
    top: Math.min(y, childrenTop),
    bottom: Math.max(y + node.height, childrenBottom)
  };
}

function compareNodesForLayout(left: CanvasNode, right: CanvasNode) {
  if (left.createdAt !== right.createdAt) return left.createdAt.localeCompare(right.createdAt);
  return left.id.localeCompare(right.id);
}
