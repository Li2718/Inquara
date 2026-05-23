"use client";

import type { CanvasNode, NodeMessage } from "@inquara/domain";
import { useState } from "react";
import { SelectionFollowupToolbar } from "../canvas/SelectionFollowupToolbar";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";

type SelectionState = {
  message: NodeMessage;
  quote: string;
  start: number;
  end: number;
};

export function MessageList({ node }: { node: CanvasNode }) {
  const { state, commands, sendCommand } = useWorkspaceSession();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const messages = (state.snapshot?.messages ?? []).filter(message => message.nodeId === node.id);

  function captureSelection(message: NodeMessage) {
    if (message.role !== "assistant") return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    if (!selected) {
      setSelection(null);
      return;
    }
    const start = message.content.indexOf(selected);
    if (start < 0) {
      setSelection(null);
      return;
    }
    setSelection({ message, quote: selected, start, end: start + selected.length });
  }

  function askFollowUp() {
    if (!selection) return;
    sendCommand(
      commands.createNodeFromSelection({
        sourceNodeId: node.id,
        sourceMessageId: selection.message.id,
        sourceQuote: selection.quote,
        sourceRangeStart: selection.start,
        sourceRangeEnd: selection.end,
        x: node.x + node.width + 120,
        y: node.y + 40
      })
    );
    setSelection(null);
  }

  return (
    <div className="message-list">
      {messages.map(message => (
        <article
          key={message.id}
          className={`message-bubble message-${message.role}`}
          onMouseUp={() => captureSelection(message)}
        >
          <p>{message.content || (message.status === "streaming" ? "Thinking..." : "")}</p>
          {message.status !== "complete" ? <small>{message.status}</small> : null}
        </article>
      ))}
      {selection ? <SelectionFollowupToolbar onFollowUp={askFollowUp} /> : null}
    </div>
  );
}
