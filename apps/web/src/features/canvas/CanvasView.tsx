"use client";

import type { CanvasNode } from "@inquara/domain";
import {
  applyNodeChanges,
  Background,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasNodeView } from "./CanvasNodeView";
import { findFirstVisibleRootNode } from "./rootNodeFocus";

export type ChatFlowNode = Node<CanvasNode, "chatNode">;

const nodeTypes: NodeTypes = {
  chatNode: CanvasNodeView
};

export function CanvasView() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  );
}

function CanvasFlow() {
  const { state, commands, sendCommand } = useWorkspaceSession();
  const { screenToFlowPosition, setCenter } = useReactFlow();
  const snapshot = state.snapshot;
  const [contextMenu, setContextMenu] = useState<null | { screenX: number; screenY: number; flowX: number; flowY: number }>(null);
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

  const resetViewportToRoot = () => {
    if (!firstRootNode) return;
    void setCenter(firstRootNode.x + firstRootNode.width / 2, firstRootNode.y + firstRootNode.height / 2, {
      duration: 300,
      zoom: 0.72
    });
  };

  if (!snapshot) {
    return <div className="canvas-loading">Loading canvas...</div>;
  }

  return (
    <div className="canvas-view">
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
      <button
        type="button"
        className="canvas-reset-view-button"
        aria-label="Reset view to root chat"
        title="Reset view"
        disabled={!firstRootNode}
        onClick={resetViewportToRoot}
      >
        ⌖
      </button>
      {contextMenu ? (
        <div
          className="canvas-context-menu"
          role="menu"
          aria-label="Canvas actions"
          style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
        >
          <button type="button" role="menuitem" onClick={createNodeFromContextMenu}>
            New chat
          </button>
        </div>
      ) : null}
    </div>
  );
}
