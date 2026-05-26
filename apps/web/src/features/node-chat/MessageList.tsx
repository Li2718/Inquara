"use client";

import type { CanvasNode, NodeMessage } from "@inquara/domain";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SelectionFollowupToolbar } from "../canvas/SelectionFollowupToolbar";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { isScrolledNearBottom, stickToBottom } from "./scrollStickiness";
import { getLastVisibleSelectionRect, toViewportToolbarPoint } from "./selectionToolbarPosition";
import { findSourceRange, getTextRangeInElement } from "./sourceRange";

type SelectionState = {
  message: NodeMessage;
  quote: string;
  start: number;
  end: number;
  toolbarX: number;
  toolbarY: number;
};

export function MessageList({ node }: { node: CanvasNode }) {
  const { state, commands, sendCommand } = useWorkspaceSession();
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const messages = (state.snapshot?.messages ?? []).filter(message => message.nodeId === node.id);

  useEffect(() => {
    const element = listRef.current;
    if (!element || !shouldStickToBottomRef.current) return;
    stickToBottom(element);
  }, [messages]);

  useEffect(() => {
    const element = listRef.current;
    if (!element || node.scrollTop <= 0) return;
    element.scrollTop = node.scrollTop;
    shouldStickToBottomRef.current = isScrolledNearBottom(element);
  }, [node.id]);

  useEffect(() => {
    function clearStaleSelection() {
      if (normalizeSelectionText(window.getSelection()?.toString() ?? "")) return;
      setSelection(null);
    }

    document.addEventListener("selectionchange", clearStaleSelection);
    return () => document.removeEventListener("selectionchange", clearStaleSelection);
  }, []);

  function updateStickiness() {
    const element = listRef.current;
    if (!element) return;
    shouldStickToBottomRef.current = isScrolledNearBottom(element);
    if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
    scrollSaveTimerRef.current = window.setTimeout(() => {
      sendCommand(commands.updateNodeScroll(node.id, element.scrollTop));
    }, 250);
  }

  function captureSelection(message: NodeMessage) {
    if (message.role !== "assistant") return;
    const element = listRef.current;
    if (!element) {
      setSelection(null);
      return;
    }
    const selected = normalizeSelectionText(window.getSelection()?.toString() ?? "");
    const range = window.getSelection()?.rangeCount ? window.getSelection()?.getRangeAt(0) : null;
    const selectionRect = range ? getLastVisibleSelectionRect(Array.from(range.getClientRects())) : null;
    if (!selected || !selectionRect) {
      setSelection(null);
      return;
    }
    const messageElement = range?.commonAncestorContainer.parentElement?.closest<HTMLElement>("[data-message-content]");
    const sourceRange =
      range && messageElement && element.contains(messageElement)
        ? getTextRangeInElement(messageElement, range) ?? findSourceRange(message.content, selected)
        : findSourceRange(message.content, selected);
    if (!sourceRange) {
      setSelection(null);
      return;
    }
    const toolbarPoint = toViewportToolbarPoint({
      selectionRect,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth
    });
    setSelection({
      message,
      quote: selected,
      start: sourceRange.start,
      end: sourceRange.end,
      toolbarX: toolbarPoint.x,
      toolbarY: toolbarPoint.y
    });
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

  function toggleBranch(node: CanvasNode) {
    if (node.hiddenAt) {
      sendCommand(commands.restoreNodeBranch(node.id));
      return;
    }
    sendCommand(commands.hideNodeSubtree(node.id, node.scrollTop));
  }

  return (
    <div ref={listRef} className="message-list nodrag nowheel" data-testid="message-list" onScroll={updateStickiness}>
      {messages.map(message => (
        <article
          key={message.id}
          className={`message-bubble message-${message.role}`}
          onMouseUp={() => captureSelection(message)}
          data-message-content
        >
          <p>
            <MessageContent
              message={message}
              branchNodes={(state.snapshot?.nodes ?? []).filter(node => node.sourceMessageId === message.id && !node.deletedAt)}
              onToggleBranch={toggleBranch}
            />
          </p>
          {message.status !== "complete" ? <small>{message.status}</small> : null}
        </article>
      ))}
      {selection ? (
        <SelectionFollowupToolbar
          x={selection.toolbarX}
          y={selection.toolbarY}
          onFollowUp={askFollowUp}
        />
      ) : null}
    </div>
  );
}

function normalizeSelectionText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function MessageContent({
  message,
  branchNodes,
  onToggleBranch
}: {
  message: NodeMessage;
  branchNodes: CanvasNode[];
  onToggleBranch(node: CanvasNode): void;
}) {
  const content = message.content || (message.status === "streaming" ? "Thinking..." : "");
  const sortedBranches = [...branchNodes]
    .filter(node => node.sourceRangeStart !== null && node.sourceRangeEnd !== null)
    .sort((left, right) => (left.sourceRangeStart ?? 0) - (right.sourceRangeStart ?? 0));
  if (sortedBranches.length === 0) return <>{content}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const branch of sortedBranches) {
    const start = branch.sourceRangeStart ?? 0;
    const end = branch.sourceRangeEnd ?? start;
    if (start < cursor || start >= content.length || end <= start) continue;
    if (cursor < start) parts.push(<span key={`${branch.id}-before`}>{content.slice(cursor, start)}</span>);
    parts.push(
      <span
        key={branch.id}
        role="button"
        tabIndex={0}
        className="source-highlight"
        data-hidden={branch.hiddenAt ? "true" : "false"}
        onClick={() => onToggleBranch(branch)}
        onKeyDown={event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          onToggleBranch(branch);
        }}
      >
        {content.slice(start, Math.min(end, content.length))}
      </span>
    );
    cursor = Math.min(end, content.length);
  }
  if (cursor < content.length) parts.push(<span key="tail">{content.slice(cursor)}</span>);
  return <>{parts}</>;
}
