export const MIN_NODE_WIDTH = 320;
export const MIN_NODE_HEIGHT = 360;

export type NodeSize = {
  width: number;
  height: number;
};

export function clampNodeSize(size: NodeSize): NodeSize {
  return {
    width: Math.max(MIN_NODE_WIDTH, Math.round(size.width)),
    height: Math.max(MIN_NODE_HEIGHT, Math.round(size.height))
  };
}
