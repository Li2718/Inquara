import type { CanvasNode } from "@inquara/domain";

export function findFirstVisibleRootNode(nodes: CanvasNode[]): CanvasNode | null {
  return [...nodes]
    .filter(node => !node.parentNodeId && !node.hiddenAt && !node.deletedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null;
}
