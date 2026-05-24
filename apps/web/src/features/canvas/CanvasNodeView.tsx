"use client";

import type { CanvasNode } from "@inquara/domain";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeChatPanel } from "../node-chat/NodeChatPanel";
import type { ChatFlowNode } from "./CanvasView";

export const CanvasNodeView = memo(function CanvasNodeView({ id, data }: NodeProps<ChatFlowNode>) {
  return (
    <section className="canvas-node" data-testid="canvas-node" data-node-id={id} data-position={`${Math.round(data.x)},${Math.round(data.y)}`}>
      <Handle type="target" position={Position.Left} />
      <header className="canvas-node-header">
        <strong>{data.title}</strong>
        <span>{data.collapsed ? "Closed" : "Open"}</span>
      </header>
      {!data.collapsed ? <NodeChatPanel node={data} /> : null}
      <Handle type="source" position={Position.Right} />
    </section>
  );
});
