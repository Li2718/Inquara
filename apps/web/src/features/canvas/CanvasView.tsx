"use client";

import { calculateOrganizedNodePositions, type CanvasNode } from "@inquara/domain";
import {
  applyNodeChanges,
  Background,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type MutableRefObject } from "react";
import { FloatingCircleButton, LoadingState, OrganizeLayoutIcon, PopupMenu, PopupMenuItem, ResetViewIcon } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { interpolate } from "../../shared/messages";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasNodeView } from "./CanvasNodeView";
import { CanvasViewportProvider } from "./CanvasViewportContext";
import { calculateRootViewport, findFirstVisibleRootNode } from "./rootNodeFocus";
import { useCanvasVisibilityMotion } from "./useCanvasVisibilityMotion";
import {
  advanceCanvasViewportStability,
  initialCanvasViewportStabilityState,
  type CanvasViewportMeasurement,
  type CanvasViewportStabilityState
} from "./viewportStability";

export type ChatFlowNodeData = CanvasNode & {
  isAppearing?: boolean;
  isExiting?: boolean;
};
export type ChatFlowNode = Node<ChatFlowNodeData, "chatNode">;

const nodeTypes: NodeTypes = {
  chatNode: CanvasNodeView
};

const CANVAS_CONTEXT_MENU_EXIT_MS = 110;
const CANVAS_ITEM_EXIT_MS = 150;

export function CanvasView({
  isPreparingWorkspaceSwitch,
  isSidebarOpen,
  resetViewportRequest,
  routeWorkspaceId
}: {
  isPreparingWorkspaceSwitch: boolean;
  isSidebarOpen: boolean;
  resetViewportRequest: number;
  routeWorkspaceId: string;
}) {
  return (
    <ReactFlowProvider>
      <CanvasFlow
        isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch}
        isSidebarOpen={isSidebarOpen}
        resetViewportRequest={resetViewportRequest}
        routeWorkspaceId={routeWorkspaceId}
      />
    </ReactFlowProvider>
  );
}

function CanvasFlow({
  isPreparingWorkspaceSwitch,
  isSidebarOpen,
  resetViewportRequest,
  routeWorkspaceId
}: {
  isPreparingWorkspaceSwitch: boolean;
  isSidebarOpen: boolean;
  resetViewportRequest: number;
  routeWorkspaceId: string;
}) {
  const { messages } = useLocale();
  const copy = messages.canvas;
  const { state, commands, sendCommand } = useWorkspaceSession();
  const isBlocked = state.leaseState !== "active";
  const isViewportBlocked = state.leaseState === "acquiring" || state.leaseState === "blocked-stale";
  const { screenToFlowPosition } = useReactFlow();
  const placementViewportRef = useRef<ReturnType<typeof calculatePlacementViewport> | undefined>(undefined);
  const placementViewportContext = useMemo(
    () => ({
      getPlacementViewport: () => placementViewportRef.current
    }),
    []
  );
  const snapshot = state.snapshot;
  const workspaceId = snapshot?.workspace.id ?? null;
  const isShowingStaleSnapshot = Boolean(workspaceId && workspaceId !== routeWorkspaceId);
  const previousWorkspaceIdRef = useRef<string | null>(workspaceId);
  const previousVisibleFlowItemsRef = useRef<{
    edges: Map<string, Edge>;
    nodes: Map<string, ChatFlowNode>;
    workspaceId: string | null;
  }>({ edges: new Map(), nodes: new Map(), workspaceId: null });
  const [contextMenu, setContextMenu] = useState<null | { screenX: number; screenY: number; flowX: number; flowY: number }>(null);
  const [exitingEdges, setExitingEdges] = useState<Edge[]>([]);
  const [exitingNodes, setExitingNodes] = useState<ChatFlowNode[]>([]);
  const [isSettlingWorkspace, setIsSettlingWorkspace] = useState(false);
  const [isViewportReady, setIsViewportReady] = useState(false);
  const contextMenuCreateTimerRef = useRef<number | null>(null);
  const firstRootNode = useMemo(() => findFirstVisibleRootNode(snapshot?.nodes ?? []), [snapshot?.nodes]);
  const visibleNodes = useMemo(
    () => (snapshot?.nodes ?? []).filter(node => !node.hiddenAt && !node.deletedAt),
    [snapshot?.nodes]
  );
  const visibleEdges = useMemo(
    () =>
      (snapshot?.edges ?? []).filter(edge => {
        const source = snapshot?.nodes.find(node => node.id === edge.sourceNodeId);
        const target = snapshot?.nodes.find(node => node.id === edge.targetNodeId);
        return source && target && !source.hiddenAt && !source.deletedAt && !target.hiddenAt && !target.deletedAt;
      }),
    [snapshot?.edges, snapshot?.nodes]
  );
  const visibleNodeIds = useMemo(() => visibleNodes.map(node => node.id), [visibleNodes]);
  const visibleEdgeIds = useMemo(() => visibleEdges.map(edge => edge.id), [visibleEdges]);
  const { appearingEdgeIds, appearingNodeIds } = useCanvasVisibilityMotion({
    edgeIds: visibleEdgeIds,
    nodeIds: visibleNodeIds,
    workspaceId
  });

  const visibleFlowNodes = useMemo<ChatFlowNode[]>(
    () =>
      visibleNodes.map(node => ({
        id: node.id,
        type: "chatNode",
        position: { x: node.x, y: node.y },
        data: { ...node, isAppearing: appearingNodeIds.has(node.id) },
        style: { width: node.width, height: node.height },
        width: node.width,
        height: node.height,
        dragHandle: ".canvas-node-header"
      })),
    [appearingNodeIds, visibleNodes]
  );
  const visibleFlowNodeIdSet = useMemo(() => new Set(visibleFlowNodes.map(node => node.id)), [visibleFlowNodes]);

  useEffect(() => {
    setIsViewportReady(false);
  }, [workspaceId]);

  const handleViewportReady = useCallback(() => {
    setIsViewportReady(true);
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    if (previousWorkspaceIdRef.current === null) {
      previousWorkspaceIdRef.current = workspaceId;
      return;
    }
    if (previousWorkspaceIdRef.current === workspaceId) return;

    previousWorkspaceIdRef.current = workspaceId;
    setIsSettlingWorkspace(true);
    const timeout = window.setTimeout(() => setIsSettlingWorkspace(false), 110);
    return () => window.clearTimeout(timeout);
  }, [workspaceId]);

  const visibleFlowEdges = useMemo<Edge[]>(
    () =>
      visibleEdges.map(edge => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        className: ["canvas-edge", appearingEdgeIds.has(edge.id) ? "canvas-edge-appearing" : ""]
          .filter(Boolean)
          .join(" ")
      })),
    [appearingEdgeIds, visibleEdges]
  );
  const visibleFlowEdgeIdSet = useMemo(() => new Set(visibleFlowEdges.map(edge => edge.id)), [visibleFlowEdges]);

  useLayoutEffect(() => {
    const previous = previousVisibleFlowItemsRef.current;
    const nextNodeMap = new Map(visibleFlowNodes.map(node => [node.id, node]));
    const nextEdgeMap = new Map(visibleFlowEdges.map(edge => [edge.id, edge]));

    if (!workspaceId || previous.workspaceId !== workspaceId) {
      previousVisibleFlowItemsRef.current = {
        edges: nextEdgeMap,
        nodes: nextNodeMap,
        workspaceId
      };
      setExitingEdges([]);
      setExitingNodes([]);
      return;
    }

    const removedNodes = [...previous.nodes.values()]
      .filter(node => !nextNodeMap.has(node.id))
      .map(node => ({
        ...node,
        data: { ...node.data, isAppearing: false, isExiting: true },
        selected: false
      }));
    const removedEdges = [...previous.edges.values()]
      .filter(edge => !nextEdgeMap.has(edge.id))
      .map(edge => ({
        ...edge,
        className: [edge.className?.replace("canvas-edge-appearing", "").trim(), "canvas-edge-exiting"]
          .filter(Boolean)
          .join(" "),
        selected: false
      }));

    previousVisibleFlowItemsRef.current = {
      edges: nextEdgeMap,
      nodes: nextNodeMap,
      workspaceId
    };

    setExitingNodes(current => current.filter(node => !nextNodeMap.has(node.id)));
    setExitingEdges(current => current.filter(edge => !nextEdgeMap.has(edge.id)));

    if (removedNodes.length === 0 && removedEdges.length === 0) return;

    const removedNodeIds = new Set(removedNodes.map(node => node.id));
    const removedEdgeIds = new Set(removedEdges.map(edge => edge.id));
    setExitingNodes(current => [
      ...current.filter(node => !removedNodeIds.has(node.id) && !nextNodeMap.has(node.id)),
      ...removedNodes
    ]);
    setExitingEdges(current => [
      ...current.filter(edge => !removedEdgeIds.has(edge.id) && !nextEdgeMap.has(edge.id)),
      ...removedEdges
    ]);

    const timeout = window.setTimeout(() => {
      setExitingNodes(current => current.filter(node => !removedNodeIds.has(node.id)));
      setExitingEdges(current => current.filter(edge => !removedEdgeIds.has(edge.id)));
    }, CANVAS_ITEM_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [visibleFlowEdges, visibleFlowNodes, workspaceId]);

  const renderedNodes = useMemo(
    () => [
      ...visibleFlowNodes,
      ...exitingNodes.filter(node => !visibleFlowNodeIdSet.has(node.id))
    ],
    [exitingNodes, visibleFlowNodeIdSet, visibleFlowNodes]
  );
  const renderedEdges = useMemo(
    () => [
      ...visibleFlowEdges,
      ...exitingEdges.filter(edge => !visibleFlowEdgeIdSet.has(edge.id))
    ],
    [exitingEdges, visibleFlowEdgeIdSet, visibleFlowEdges]
  );
  const [nodes, setNodes] = useState<ChatFlowNode[]>(renderedNodes);

  useLayoutEffect(() => {
    setNodes(renderedNodes);
  }, [renderedNodes]);

  useEffect(() => {
    if (exitingNodes.length === 0 && exitingEdges.length === 0) return;
    const timeout = window.setTimeout(() => {
      setExitingNodes([]);
      setExitingEdges([]);
    }, CANVAS_ITEM_EXIT_MS);
    return () => window.clearTimeout(timeout);
  }, [exitingEdges.length, exitingNodes.length]);

  useEffect(() => {
    return () => {
      if (contextMenuCreateTimerRef.current) window.clearTimeout(contextMenuCreateTimerRef.current);
    };
  }, []);

  const onNodeDragStop: OnNodeDrag = (_event, node) => {
    void sendCommand(commands.updateNodePosition(node.id, node.position));
  };

  const onNodesChange = (changes: NodeChange<ChatFlowNode>[]) => {
    setNodes(currentNodes => applyNodeChanges(changes, currentNodes) as ChatFlowNode[]);
  };

  const organizeCanvas = useCallback(() => {
    if (!snapshot || isBlocked) return;
    const nextPositions = calculateOrganizedNodePositions(snapshot.nodes);
    if (nextPositions.size === 0) return;

    setNodes(currentNodes =>
      currentNodes.map(node => {
        const nextPosition = nextPositions.get(node.id);
        return nextPosition
          ? {
              ...node,
              position: nextPosition,
              data: { ...node.data, x: nextPosition.x, y: nextPosition.y }
            }
          : node;
      })
    );
    void sendCommand(commands.organizeCanvasNodes());
  }, [commands, isBlocked, sendCommand, snapshot]);

  const onPaneContextMenu = (event: MouseEvent | ReactMouseEvent<Element>) => {
    event.preventDefault();
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
    setContextMenu({
      screenX: event.clientX,
      screenY: event.clientY,
      flowX: position.x,
      flowY: position.y
    });
  };

  const createNodeFromContextMenu = () => {
    if (!contextMenu) return;
    if (isBlocked) return;
    const position = { x: contextMenu.flowX, y: contextMenu.flowY };
    setContextMenu(null);
    if (contextMenuCreateTimerRef.current) window.clearTimeout(contextMenuCreateTimerRef.current);
    contextMenuCreateTimerRef.current = window.setTimeout(() => {
      void sendCommand(commands.createNodeAtPosition(position));
      contextMenuCreateTimerRef.current = null;
    }, CANVAS_CONTEXT_MENU_EXIT_MS);
  };

  if (!snapshot) {
    return (
      <div className="canvas-loading">
        <LoadingState variant="canvas" aria-label={copy.loadingCanvas} />
      </div>
    );
  }

  return (
    <div
      className="canvas-view"
      data-workspace-transition={
        isPreparingWorkspaceSwitch || isShowingStaleSnapshot
          ? "leaving"
          : state.leaseState === "acquiring" || state.leaseState === "recovering" || isSettlingWorkspace
            ? "entering"
            : "idle"
      }
    >
      <CanvasViewportProvider value={placementViewportContext}>
        <ReactFlow
          nodes={isViewportReady ? nodes : []}
          edges={isViewportReady ? renderedEdges : []}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={() => setContextMenu(null)}
          onPaneContextMenu={onPaneContextMenu}
          nodesConnectable={false}
          elementsSelectable={false}
          nodesDraggable={!isBlocked}
          panOnDrag={!isViewportBlocked}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={28} size={1} />
          <CanvasPlacementViewportTracker placementViewportRef={placementViewportRef} />
          <CanvasInitialViewport
            firstRootNode={firstRootNode}
            isSidebarOpen={isSidebarOpen}
            onReady={handleViewportReady}
            workspaceId={workspaceId}
          />
        </ReactFlow>
      </CanvasViewportProvider>
      {!isViewportReady ? (
        <div className="canvas-loading">
          <LoadingState variant="canvas" aria-label={copy.preparingCanvas} />
        </div>
      ) : null}
      {isViewportReady ? (
        <CanvasViewportControls
          firstRootNode={firstRootNode}
          isSidebarOpen={isSidebarOpen}
          isBlocked={isBlocked}
          onOrganize={organizeCanvas}
          resetViewportRequest={resetViewportRequest}
        />
      ) : null}
      <PopupMenu
        className="canvas-context-menu"
        aria-label={copy.actions}
        isOpen={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        style={contextMenu ? { left: contextMenu.screenX, top: contextMenu.screenY } : undefined}
      >
        <PopupMenuItem onClick={createNodeFromContextMenu}>
          {copy.newChat}
        </PopupMenuItem>
      </PopupMenu>
    </div>
  );
}

function CanvasInitialViewport({
  firstRootNode,
  isSidebarOpen,
  onReady,
  workspaceId
}: {
  firstRootNode: CanvasNode | null;
  isSidebarOpen: boolean;
  onReady(): void;
  workspaceId: string | null;
}) {
  const { setViewport } = useReactFlow();
  const initializedWorkspaceIdRef = useRef<string | null>(null);
  const stabilityRef = useRef<CanvasViewportStabilityState>(initialCanvasViewportStabilityState);

  useLayoutEffect(() => {
    if (!workspaceId || !firstRootNode) return;
    if (initializedWorkspaceIdRef.current !== workspaceId) {
      initializedWorkspaceIdRef.current = null;
      stabilityRef.current = initialCanvasViewportStabilityState;
    }
    if (initializedWorkspaceIdRef.current === workspaceId) {
      onReady();
      return;
    }

    let cancelled = false;
    let frame = 0;

    const measure = () => {
      if (cancelled) return;
      const measurement = getCanvasViewportMeasurement(isSidebarOpen);
      if (!measurement) {
        frame = window.requestAnimationFrame(measure);
        return;
      }

      const next = advanceCanvasViewportStability(stabilityRef.current, measurement);
      stabilityRef.current = next.state;
      if (!next.isStable) {
        frame = window.requestAnimationFrame(measure);
        return;
      }

      void setViewport(
        calculateRootViewport({
          rootNode: firstRootNode,
          viewportWidth: measurement.viewportWidth,
          viewportHeight: measurement.viewportHeight,
          reservedLeft: measurement.reservedLeft
        }),
        { duration: 0 }
      );
      initializedWorkspaceIdRef.current = workspaceId;
      onReady();
    };

    frame = window.requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [firstRootNode, isSidebarOpen, onReady, setViewport, workspaceId]);

  return null;
}

function getCanvasViewportMeasurement(isSidebarOpen: boolean): CanvasViewportMeasurement | null {
  const stage = document.querySelector(".canvas-stage");
  const sidebar = isSidebarOpen ? document.querySelector(".workspace-sidebar") : null;
  const stageRect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
  const sidebarRect = sidebar instanceof HTMLElement ? sidebar.getBoundingClientRect() : null;
  if (!stageRect || stageRect.width <= 0 || stageRect.height <= 0) return null;

  return {
    reservedLeft: stageRect && sidebarRect ? Math.max(0, sidebarRect.right - stageRect.left + 16) : 0,
    viewportWidth: stageRect.width,
    viewportHeight: stageRect.height
  };
}

function CanvasPlacementViewportTracker({
  placementViewportRef
}: {
  placementViewportRef: MutableRefObject<ReturnType<typeof calculatePlacementViewport> | undefined>;
}) {
  const viewport = useViewport();

  useLayoutEffect(() => {
    placementViewportRef.current = calculatePlacementViewport(viewport);
  }, [placementViewportRef, viewport]);

  return null;
}

function calculatePlacementViewport(viewport: { x: number; y: number; zoom: number }) {
  const stage = document.querySelector(".canvas-stage");
  const stageRect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
  const width = stageRect?.width ?? window.innerWidth;
  const height = stageRect?.height ?? window.innerHeight;

  return {
    height: height / viewport.zoom,
    width: width / viewport.zoom,
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom
  };
}

function CanvasViewportControls({
  firstRootNode,
  isBlocked,
  isSidebarOpen,
  onOrganize,
  resetViewportRequest
}: {
  firstRootNode: CanvasNode | null;
  isBlocked: boolean;
  isSidebarOpen: boolean;
  onOrganize(): void;
  resetViewportRequest: number;
}) {
  const { messages } = useLocale();
  const copy = messages.canvas;
  const { setViewport } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);
  const resetViewportToRoot = useCallback(() => {
    if (!firstRootNode) return;
    const stage = document.querySelector(".canvas-stage");
    const sidebar = isSidebarOpen ? document.querySelector(".workspace-sidebar") : null;
    const stageRect = stage instanceof HTMLElement ? stage.getBoundingClientRect() : null;
    const sidebarRect = sidebar instanceof HTMLElement ? sidebar.getBoundingClientRect() : null;
    const reservedLeft = stageRect && sidebarRect ? Math.max(0, sidebarRect.right - stageRect.left + 16) : 0;
    void setViewport(
      calculateRootViewport({
        rootNode: firstRootNode,
        viewportWidth: stageRect?.width ?? window.innerWidth,
        viewportHeight: stageRect?.height ?? window.innerHeight,
        reservedLeft
      }),
      { duration: 300 }
    );
  }, [firstRootNode, isSidebarOpen, setViewport]);

  useEffect(() => {
    if (resetViewportRequest === 0) return;
    resetViewportToRoot();
  }, [resetViewportRequest, resetViewportToRoot]);

  return (
    <div className="canvas-viewport-controls" aria-label={copy.zoomControls}>
      <span className="canvas-viewport-zoom-label" aria-label={interpolate(copy.currentZoom, { percent: zoomPercent })}>
        {zoomPercent}%
      </span>
      <FloatingCircleButton
        size="sm"
        aria-label={copy.organizeAria}
        title={copy.organize}
        disabled={isBlocked}
        onClick={onOrganize}
      >
        <OrganizeLayoutIcon />
      </FloatingCircleButton>
      <FloatingCircleButton
        size="sm"
        aria-label={copy.resetViewAria}
        title={copy.resetView}
        disabled={!firstRootNode}
        onClick={resetViewportToRoot}
      >
        <ResetViewIcon />
      </FloatingCircleButton>
    </div>
  );
}
