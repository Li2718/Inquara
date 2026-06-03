import type { CanvasNode } from "@inquara/domain";

export const ROOT_VIEWPORT_ZOOM = 1;

export type RootViewportInput = {
  rootNode: Pick<CanvasNode, "x" | "y" | "width" | "height">;
  viewportWidth: number;
  viewportHeight: number;
};

export function findFirstVisibleRootNode(nodes: CanvasNode[]): CanvasNode | null {
  return [...nodes]
    .filter(node => !node.parentNodeId && !node.hiddenAt && !node.deletedAt)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0] ?? null;
}

export function calculateRootViewport({ rootNode, viewportWidth, viewportHeight }: RootViewportInput) {
  const availableCenterX = viewportWidth / 2;
  const rootCenterX = rootNode.x + rootNode.width / 2;
  const rootCenterY = rootNode.y + rootNode.height / 2;

  return {
    x: availableCenterX - rootCenterX * ROOT_VIEWPORT_ZOOM,
    y: viewportHeight / 2 - rootCenterY * ROOT_VIEWPORT_ZOOM,
    zoom: ROOT_VIEWPORT_ZOOM
  };
}
