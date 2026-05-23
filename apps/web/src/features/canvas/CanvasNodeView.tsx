"use client";

import type { CanvasNode } from "@inquara/domain";
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeChatPanel } from "../node-chat/NodeChatPanel";
import type { ChatFlowNode } from "./CanvasView";

export const CanvasNodeView = memo(function CanvasNodeView({ data }: NodeProps<ChatFlowNode>) {
  return (
    <section className="canvas-node">
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
