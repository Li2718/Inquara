"use client";

import type { CanvasNode } from "@inquara/domain";
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
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { FloatingCircleButton, PopupMenu, PopupMenuItem, ResetViewIcon } from "../../shared/components/ui";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasNodeView } from "./CanvasNodeView";
import { calculateRootViewport, findFirstVisibleRootNode } from "./rootNodeFocus";

export type ChatFlowNode = Node<CanvasNode, "chatNode">;

const nodeTypes: NodeTypes = {
  chatNode: CanvasNodeView
};

export function CanvasView({
  isPreparingWorkspaceSwitch,
  isSidebarOpen,
  routeWorkspaceId
}: {
  isPreparingWorkspaceSwitch: boolean;
  isSidebarOpen: boolean;
  routeWorkspaceId: string;
}) {
  return (
    <ReactFlowProvider>
      <CanvasFlow isPreparingWorkspaceSwitch={isPreparingWorkspaceSwitch} isSidebarOpen={isSidebarOpen} routeWorkspaceId={routeWorkspaceId} />
    </ReactFlowProvider>
  );
}

function CanvasFlow({
  isPreparingWorkspaceSwitch,
  isSidebarOpen,
  routeWorkspaceId
}: {
  isPreparingWorkspaceSwitch: boolean;
  isSidebarOpen: boolean;
  routeWorkspaceId: string;
}) {
  const { state, commands, sendCommand } = useWorkspaceSession();
  const { screenToFlowPosition } = useReactFlow();
  const snapshot = state.snapshot;
  const workspaceId = snapshot?.workspace.id ?? null;
  const isShowingStaleSnapshot = Boolean(workspaceId && workspaceId !== routeWorkspaceId);
  const previousWorkspaceIdRef = useRef<string | null>(workspaceId);
  const [contextMenu, setContextMenu] = useState<null | { screenX: number; screenY: number; flowX: number; flowY: number }>(null);
  const [isSettlingWorkspace, setIsSettlingWorkspace] = useState(false);
  const firstRootNode = useMemo(() => findFirstVisibleRootNode(snapshot?.nodes ?? []), [snapshot?.nodes]);

  const snapshotNodes = useMemo<ChatFlowNode[]>(
    () =>
      (snapshot?.nodes ?? [])
        .filter(node => !node.hiddenAt && !node.deletedAt)
        .map(node => ({
          id: node.id,
          type: "chatNode",
          position: { x: node.x, y: node.y },
          data: node,
          style: { width: node.width, height: node.height },
          width: node.width,
          height: node.height,
          dragHandle: ".canvas-node-header"
        })),
    [snapshot?.nodes]
  );
  const [nodes, setNodes] = useState<ChatFlowNode[]>(snapshotNodes);

  useEffect(() => {
    setNodes(snapshotNodes);
  }, [snapshotNodes]);

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

  const edges = useMemo<Edge[]>(
    () =>
      (snapshot?.edges ?? [])
        .filter(edge => {
          const source = snapshot?.nodes.find(node => node.id === edge.sourceNodeId);
          const target = snapshot?.nodes.find(node => node.id === edge.targetNodeId);
          return source && target && !source.hiddenAt && !source.deletedAt && !target.hiddenAt && !target.deletedAt;
        })
        .map(edge => ({
          id: edge.id,
          source: edge.sourceNodeId,
          target: edge.targetNodeId,
          className: "canvas-edge"
        })),
    [snapshot?.edges, snapshot?.nodes]
  );

  const onNodeDragStop: OnNodeDrag = (_event, node) => {
    sendCommand(commands.updateNodePosition(node.id, node.position));
  };

  const onNodesChange = (changes: NodeChange<ChatFlowNode>[]) => {
    setNodes(currentNodes => applyNodeChanges(changes, currentNodes) as ChatFlowNode[]);
  };

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
    sendCommand(
      commands.createNodeAtPosition({
        x: contextMenu.flowX,
        y: contextMenu.flowY
      })
    );
    setContextMenu(null);
  };

  if (!snapshot) {
    return <div className="canvas-loading">Loading canvas...</div>;
  }

  return (
    <div
      className="canvas-view"
      data-workspace-transition={
        isPreparingWorkspaceSwitch || isShowingStaleSnapshot
          ? "leaving"
          : state.connectionStatus === "connecting" || isSettlingWorkspace
            ? "entering"
            : "idle"
      }
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={() => setContextMenu(null)}
        onPaneContextMenu={onPaneContextMenu}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ maxZoom: 0.72, padding: 0.24 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={28} size={1} />
      </ReactFlow>
      <CanvasViewportControls firstRootNode={firstRootNode} isSidebarOpen={isSidebarOpen} />
      {contextMenu ? (
        <PopupMenu
          className="canvas-context-menu"
          aria-label="Canvas actions"
          onClose={() => setContextMenu(null)}
          style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
        >
          <PopupMenuItem onClick={createNodeFromContextMenu}>
            New chat
          </PopupMenuItem>
        </PopupMenu>
      ) : null}
    </div>
  );
}

function CanvasViewportControls({ firstRootNode, isSidebarOpen }: { firstRootNode: CanvasNode | null; isSidebarOpen: boolean }) {
  const { setViewport } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);
  const resetViewportToRoot = () => {
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
  };

  return (
    <div className="canvas-viewport-controls" aria-label="Canvas zoom controls">
      <span className="canvas-viewport-zoom-label" aria-label={`Current zoom ${zoomPercent}%`}>
        {zoomPercent}%
      </span>
      <FloatingCircleButton
        size="sm"
        aria-label="Reset view to root chat"
        title="Reset view"
        disabled={!firstRootNode}
        onClick={resetViewportToRoot}
      >
        <ResetViewIcon />
      </FloatingCircleButton>
    </div>
  );
}
