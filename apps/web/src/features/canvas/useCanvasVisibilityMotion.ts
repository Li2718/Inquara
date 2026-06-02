"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

const CANVAS_ITEM_APPEAR_MS = 200;
const CANVAS_ITEM_APPEAR_CLASS_LIFETIME_MS = CANVAS_ITEM_APPEAR_MS + 80;

type CanvasVisibilityMotionInput = {
  edgeIds: string[];
  nodeIds: string[];
  canvasId: string | null;
};

type VisibleItemSnapshot = {
  edges: Set<string>;
  isInitialized: boolean;
  nodes: Set<string>;
  canvasId: string | null;
};

export function useCanvasVisibilityMotion({ edgeIds, nodeIds, canvasId }: CanvasVisibilityMotionInput) {
  const [appearingNodeIds, setAppearingNodeIds] = useState<Set<string>>(() => new Set());
  const [appearingEdgeIds, setAppearingEdgeIds] = useState<Set<string>>(() => new Set());
  const firstFrameAppearingRef = useRef<{ edges: Set<string>; nodes: Set<string> }>({
    edges: new Set(),
    nodes: new Set()
  });
  const previousVisibleItemsRef = useRef<VisibleItemSnapshot>({
    edges: new Set(),
    isInitialized: false,
    nodes: new Set(),
    canvasId: null
  });
  const nodeIdKey = useMemo(() => nodeIds.join("|"), [nodeIds]);
  const edgeIdKey = useMemo(() => edgeIds.join("|"), [edgeIds]);

  const firstFrameNodeIds = useMemo(() => {
    const previous = previousVisibleItemsRef.current;
    if (!canvasId || previous.canvasId !== canvasId || !previous.isInitialized) return new Set<string>();
    return new Set(nodeIds.filter(id => !previous.nodes.has(id)));
  }, [nodeIds, canvasId]);

  const firstFrameEdgeIds = useMemo(() => {
    const previous = previousVisibleItemsRef.current;
    if (!canvasId || previous.canvasId !== canvasId || !previous.isInitialized) return new Set<string>();
    return new Set(edgeIds.filter(id => !previous.edges.has(id)));
  }, [edgeIds, canvasId]);

  useLayoutEffect(() => {
    const nextNodeIds = new Set(nodeIdKey ? nodeIdKey.split("|") : []);
    const nextEdgeIds = new Set(edgeIdKey ? edgeIdKey.split("|") : []);
    const previous = previousVisibleItemsRef.current;

    firstFrameAppearingRef.current = {
      edges: firstFrameEdgeIds,
      nodes: firstFrameNodeIds
    };

    if (!canvasId || previous.canvasId !== canvasId || !previous.isInitialized) {
      previousVisibleItemsRef.current = {
        edges: nextEdgeIds,
        isInitialized: true,
        nodes: nextNodeIds,
        canvasId
      };
      setAppearingNodeIds(new Set());
      setAppearingEdgeIds(new Set());
      return;
    }

    const newNodeIds = [...nextNodeIds].filter(id => !previous.nodes.has(id));
    const newEdgeIds = [...nextEdgeIds].filter(id => !previous.edges.has(id));
    previousVisibleItemsRef.current = {
      edges: nextEdgeIds,
      isInitialized: true,
      nodes: nextNodeIds,
      canvasId
    };

    if (newNodeIds.length === 0 && newEdgeIds.length === 0) return;

    setAppearingNodeIds(current => new Set([...current, ...newNodeIds]));
    setAppearingEdgeIds(current => new Set([...current, ...newEdgeIds]));
    const timeout = window.setTimeout(() => {
      firstFrameAppearingRef.current = {
        edges: new Set(),
        nodes: new Set()
      };
      setAppearingNodeIds(current => {
        const next = new Set(current);
        newNodeIds.forEach(id => next.delete(id));
        return next;
      });
      setAppearingEdgeIds(current => {
        const next = new Set(current);
        newEdgeIds.forEach(id => next.delete(id));
        return next;
      });
    }, CANVAS_ITEM_APPEAR_CLASS_LIFETIME_MS);
    return () => window.clearTimeout(timeout);
  }, [edgeIdKey, firstFrameEdgeIds, firstFrameNodeIds, nodeIdKey, canvasId]);

  return useMemo(
    () => ({
      appearingEdgeIds: new Set([...appearingEdgeIds, ...firstFrameAppearingRef.current.edges]),
      appearingNodeIds: new Set([...appearingNodeIds, ...firstFrameAppearingRef.current.nodes])
    }),
    [appearingEdgeIds, appearingNodeIds]
  );
}
