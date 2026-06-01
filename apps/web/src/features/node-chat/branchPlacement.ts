import type { CanvasNode } from "@inquara/domain";

type Point = {
  x: number;
  y: number;
};

export type PlacementViewport = Point & {
  height: number;
  width: number;
};

const DEFAULT_BRANCH_WIDTH = 420;
const DEFAULT_BRANCH_HEIGHT = 520;
const BRANCH_GAP_X = 64;
const COLLISION_PADDING = 12;

type Rect = Point & {
  height: number;
  id?: string;
  width: number;
};

type BlockedArea = {
  bottom: number;
  left: number;
  right: number;
  top: number;
};

type PlacementMode = "followup";

export function findFollowupNodePosition(
  sourceNode: CanvasNode,
  nodes: CanvasNode[],
  viewport?: PlacementViewport
): Point {
  return findOpenNodePosition({
    gap: COLLISION_PADDING,
    ideal: {
      x: sourceNode.x + sourceNode.width + BRANCH_GAP_X,
      y: sourceNode.y + 40
    },
    mode: "followup",
    obstacles: visibleNodeRects(nodes),
    size: { width: DEFAULT_BRANCH_WIDTH, height: DEFAULT_BRANCH_HEIGHT },
    ...(viewport !== undefined ? { viewport } : {})
  });
}

function findOpenNodePosition({
  gap,
  ideal,
  mode,
  obstacles,
  size,
  viewport
}: {
  gap: number;
  ideal: Point;
  mode: PlacementMode;
  obstacles: Rect[];
  size: { height: number; width: number };
  viewport?: PlacementViewport;
}): Point {
  const idealCandidate = { x: ideal.x, y: ideal.y, width: size.width, height: size.height };
  if (!viewport && !overlapsAny(idealCandidate, obstacles, gap)) return ideal;

  const blockedAreas = obstacles.map(obstacle => blockedAreaFor(obstacle, size, gap));
  const xCandidates = new Set<number>([ideal.x]);
  const yCandidates = new Set<number>([ideal.y]);

  for (const obstacle of obstacles) {
    xCandidates.add(obstacle.x - size.width - gap);
    xCandidates.add(obstacle.x + obstacle.width + gap);
    yCandidates.add(obstacle.y - size.height - gap);
    yCandidates.add(obstacle.y + obstacle.height + gap);
  }

  const sortedY = [...yCandidates].sort((a, b) => a - b);
  const yIndexByValue = new Map(sortedY.map((y, index) => [y, index]));
  let best: null | { point: Point; score: number } = null;
  for (const x of xCandidates) {
    const blockedY = blockedYIndexesForX(x, sortedY.length, yIndexByValue, blockedAreas);

    for (let yIndex = 0; yIndex < sortedY.length; yIndex += 1) {
      if (blockedY[yIndex]) continue;

      const y = sortedY[yIndex];
      if (y === undefined) continue;

      const point = { x, y };
      const score = scoreCandidate({ ...point, height: size.height, width: size.width }, ideal, mode, viewport);
      if (!best || score < best.score) best = { point, score };
    }
  }

  return best?.point ?? ideal;
}

function scoreCandidate(candidate: Rect, ideal: Point, mode: PlacementMode, viewport?: PlacementViewport): number {
  const dx = candidate.x - ideal.x;
  const dy = candidate.y - ideal.y;
  const viewportPenalty = scoreViewportPenalty(candidate, viewport);

  return Math.abs(dx) * 1.4 + Math.abs(dy) + (dx < 0 ? 300 : 0) + (dy < 0 ? 20 : 0) + viewportPenalty;
}

function visibleNodeRects(nodes: CanvasNode[]): Rect[] {
  return nodes
    .filter(node => !node.hiddenAt && !node.deletedAt)
    .map(node => {
      return {
        height: node.height,
        id: node.id,
        width: node.width,
        x: node.x,
        y: node.y
      };
    });
}

function blockedAreaFor(node: Rect, size: { height: number; width: number }, gap: number): BlockedArea {
  return {
    bottom: node.y + node.height + gap,
    left: node.x - size.width - gap,
    right: node.x + node.width + gap,
    top: node.y - size.height - gap
  };
}

function blockedYIndexesForX(
  x: number,
  yCount: number,
  yIndexByValue: Map<number, number>,
  blockedAreas: BlockedArea[]
): boolean[] {
  const changes = new Array<number>(yCount + 1).fill(0);

  for (const area of blockedAreas) {
    if (x <= area.left || x >= area.right) continue;

    const topIndex = yIndexByValue.get(area.top);
    const bottomIndex = yIndexByValue.get(area.bottom);
    if (topIndex === undefined || bottomIndex === undefined) continue;

    const startIndex = topIndex + 1;
    const endIndex = bottomIndex;
    if (startIndex >= endIndex) continue;

    changes[startIndex] = (changes[startIndex] ?? 0) + 1;
    changes[endIndex] = (changes[endIndex] ?? 0) - 1;
  }

  const blocked: boolean[] = [];
  let activeBlocks = 0;
  for (let index = 0; index < yCount; index += 1) {
    activeBlocks += changes[index] ?? 0;
    blocked[index] = activeBlocks > 0;
  }

  return blocked;
}

function overlapsAny(candidate: Rect, nodes: Rect[], gap: number): boolean {
  return nodes.some(node => overlaps(candidate, node, gap));
}

function scoreViewportPenalty(candidate: Rect, viewport?: PlacementViewport): number {
  if (!viewport) return 0;

  const overflowLeft = Math.max(0, viewport.x - candidate.x);
  const overflowTop = Math.max(0, viewport.y - candidate.y);
  const overflowRight = Math.max(0, candidate.x + candidate.width - (viewport.x + viewport.width));
  const overflowBottom = Math.max(0, candidate.y + candidate.height - (viewport.y + viewport.height));
  const overflow = overflowLeft + overflowRight + overflowTop + overflowBottom;
  if (overflow === 0) return 0;

  return 10_000 + overflow * 8;
}

function overlaps(candidate: Rect, node: Rect, gap: number): boolean {
  return !(
    candidate.x + candidate.width + gap <= node.x ||
    candidate.x >= node.x + node.width + gap ||
    candidate.y + candidate.height + gap <= node.y ||
    candidate.y >= node.y + node.height + gap
  );
}
