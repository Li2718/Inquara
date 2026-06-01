import type { CanvasNode } from "@inquara/domain";

export type HiddenSubtreeSnapshot = Record<string, {
  hiddenAt: string | null;
  offsetX: number | null;
  offsetY: number | null;
  scrollTop: number;
}>;

type Point = {
  x: number;
  y: number;
};

export function buildHiddenSubtreeSnapshot(
  nodes: CanvasNode[],
  rootNodeId: string,
  rootScrollTop?: number
): HiddenSubtreeSnapshot {
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const subtreeIds = collectSubtreeIds(nodes, rootNodeId);

  return Object.fromEntries(
    subtreeIds
      .map(nodeId => nodesById.get(nodeId))
      .filter((node): node is CanvasNode => Boolean(node))
      .map(node => {
        const parent = node.parentNodeId ? nodesById.get(node.parentNodeId) ?? null : null;
        return [
          node.id,
          {
            hiddenAt: node.hiddenAt,
            offsetX: parent ? node.x - parent.x : null,
            offsetY: parent ? node.y - parent.y : null,
            scrollTop: node.id === rootNodeId && rootScrollTop !== undefined ? rootScrollTop : node.scrollTop
          }
        ];
      })
  );
}

export function resolveRestoredSubtreePositions(
  nodes: CanvasNode[],
  rootNodeId: string,
  snapshot: HiddenSubtreeSnapshot,
  rootOverride?: Point
): Map<string, Point> {
  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const root = nodesById.get(rootNodeId);
  if (!root) return new Map();

  const childrenByParent = new Map<string, CanvasNode[]>();
  for (const node of nodes) {
    if (!node.parentNodeId) continue;
    childrenByParent.set(node.parentNodeId, [...(childrenByParent.get(node.parentNodeId) ?? []), node]);
  }

  const positions = new Map<string, Point>();
  const rootSnapshot = snapshot[rootNodeId];
  const rootParent = root.parentNodeId ? nodesById.get(root.parentNodeId) ?? null : null;
  const rootPosition =
    rootOverride ??
    (
      rootParent && rootSnapshot?.offsetX !== null && rootSnapshot?.offsetX !== undefined && rootSnapshot?.offsetY !== null && rootSnapshot?.offsetY !== undefined
        ? {
            x: rootParent.x + rootSnapshot.offsetX,
            y: rootParent.y + rootSnapshot.offsetY
          }
        : { x: root.x, y: root.y }
    );

  positions.set(root.id, rootPosition);
  resolveChildPositions(root.id, childrenByParent, snapshot, positions);

  return positions;
}

function resolveChildPositions(
  parentId: string,
  childrenByParent: Map<string, CanvasNode[]>,
  snapshot: HiddenSubtreeSnapshot,
  positions: Map<string, Point>
) {
  const parentPosition = positions.get(parentId);
  if (!parentPosition) return;

  for (const child of childrenByParent.get(parentId) ?? []) {
    const childSnapshot = snapshot[child.id];
    if (!childSnapshot) continue;

    const childPosition =
      childSnapshot.offsetX !== null && childSnapshot.offsetY !== null
        ? {
            x: parentPosition.x + childSnapshot.offsetX,
            y: parentPosition.y + childSnapshot.offsetY
          }
        : { x: child.x, y: child.y };

    positions.set(child.id, childPosition);
    resolveChildPositions(child.id, childrenByParent, snapshot, positions);
  }
}

function collectSubtreeIds(nodes: CanvasNode[], rootNodeId: string): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parentNodeId) continue;
    childrenByParent.set(node.parentNodeId, [...(childrenByParent.get(node.parentNodeId) ?? []), node.id]);
  }

  const ids: string[] = [];
  const stack = nodes.some(node => node.id === rootNodeId) ? [rootNodeId] : [];
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || ids.includes(id)) continue;
    ids.push(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }
  return ids;
}
