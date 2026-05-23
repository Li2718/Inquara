"use client";

import type { CanvasNode } from "@inquara/domain";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
  type OnNodeDrag
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { CanvasNodeView } from "./CanvasNodeView";

export type ChatFlowNode = Node<CanvasNode, "chatNode">;

const nodeTypes: NodeTypes = {
  chatNode: CanvasNodeView
};

export function CanvasView() {
  const { state, commands, sendCommand } = useWorkspaceSession();
  const snapshot = state.snapshot;

  const nodes = useMemo<ChatFlowNode[]>(
    () =>
      (snapshot?.nodes ?? []).map(node => ({
        id: node.id,
        type: "chatNode",
        position: { x: node.x, y: node.y },
        data: node,
        width: node.width,
        height: node.height
      })),
    [snapshot?.nodes]
  );

  const edges = useMemo<Edge[]>(
    () =>
      (snapshot?.edges ?? []).map(edge => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.label,
        animated: true
      })),
    [snapshot?.edges]
  );

  const onNodeDragStop: OnNodeDrag = (_event, node) => {
    sendCommand(commands.updateNodePosition(node.id, node.position));
  };

  if (!snapshot) {
    return <div className="canvas-loading">Loading canvas...</div>;
  }

  return (
    <div className="canvas-view">
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodeDragStop={onNodeDragStop} fitView>
        <Background gap={28} size={1} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
