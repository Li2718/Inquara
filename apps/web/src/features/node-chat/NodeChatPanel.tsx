"use client";

import type { CanvasNode } from "@inquara/domain";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";

export function NodeChatPanel({ node }: { node: CanvasNode }) {
  return (
    <div className="node-chat-panel nodrag">
      <MessageList node={node} />
      <MessageComposer nodeId={node.id} />
    </div>
  );
}
