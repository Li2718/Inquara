"use client";

import type { CanvasNode, NodeMessage } from "@inquara/domain";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { useCanvasPlacementViewportGetter } from "../canvas/CanvasViewportContext";
import { SelectionFollowupToolbar } from "../canvas/SelectionFollowupToolbar";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import { findFollowupNodePosition } from "./branchPlacement";
import { MessageMarkdown } from "./MessageMarkdown";
import { getMiddleDragScrollVelocity, hasScrollableOverflow, isScrolledNearBottom, stickToBottom } from "./scrollStickiness";
import { getLastVisibleSelectionRect, toViewportToolbarPoint } from "./selectionToolbarPosition";
import { findSourceRange, getRangeContainerElement, getSourceRangeInElement, getTextRangeInElement } from "./sourceRange";

type SelectionState = {
  message: NodeMessage;
  quote: string;
  start: number;
  end: number;
  toolbarX: number;
  toolbarY: number;
};

export function MessageList({ node }: { node: CanvasNode }) {
  const { messages: appMessages } = useLocale();
  const { state, commands, sendCommand } = useWorkspaceSession();
  const { getPlacementViewport } = useCanvasPlacementViewportGetter();
  const isBlocked = state.leaseState !== "active";
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottomRef = useRef(true);
  const scrollSaveTimerRef = useRef<number | null>(null);
  const middleDragRef = useRef<null | { animationFrame: number | null; currentY: number; startY: number }>(null);
  const [canScroll, setCanScroll] = useState(false);
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
    const element = listRef.current;
    if (!element) return;
    const updateCanScroll = () => setCanScroll(hasScrollableOverflow(element));
    updateCanScroll();
    const observer = new ResizeObserver(updateCanScroll);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const element = listRef.current;
      if (element) setCanScroll(hasScrollableOverflow(element));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages]);

  useEffect(() => {
    function clearStaleSelection() {
      if (normalizeSelectionText(window.getSelection()?.toString() ?? "")) return;
      setSelection(null);
    }

    document.addEventListener("selectionchange", clearStaleSelection);
    return () => document.removeEventListener("selectionchange", clearStaleSelection);
  }, []);

  useEffect(() => {
    return () => {
      const activeDrag = middleDragRef.current;
      if (activeDrag?.animationFrame) window.cancelAnimationFrame(activeDrag.animationFrame);
      middleDragRef.current = null;
    };
  }, []);

  function updateStickiness() {
    const element = listRef.current;
    if (!element) return;
    shouldStickToBottomRef.current = isScrolledNearBottom(element);
    if (scrollSaveTimerRef.current) window.clearTimeout(scrollSaveTimerRef.current);
    scrollSaveTimerRef.current = window.setTimeout(() => {
      if (isBlocked) return;
      void sendCommand(commands.updateNodeScroll(node.id, element.scrollTop));
    }, 250);
  }

  function startMiddleDragScroll(event: MouseEvent<HTMLDivElement>) {
    if (event.button !== 1 || !canScroll) return;
    const element = listRef.current;
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    middleDragRef.current = {
      animationFrame: null,
      currentY: event.clientY,
      startY: event.clientY
    };

    const scrollFrame = () => {
      const activeDrag = middleDragRef.current;
      if (!activeDrag) return;
      element.scrollTop += getMiddleDragScrollVelocity(activeDrag.currentY - activeDrag.startY);
      activeDrag.animationFrame = window.requestAnimationFrame(scrollFrame);
    };
    const scrollOnMove = (moveEvent: globalThis.MouseEvent) => {
      const activeDrag = middleDragRef.current;
      if (!activeDrag) return;
      moveEvent.preventDefault();
      activeDrag.currentY = moveEvent.clientY;
    };
    const stopMiddleDragScroll = () => {
      const activeDrag = middleDragRef.current;
      if (activeDrag?.animationFrame) window.cancelAnimationFrame(activeDrag.animationFrame);
      middleDragRef.current = null;
      window.removeEventListener("mousemove", scrollOnMove);
      window.removeEventListener("mouseup", stopMiddleDragScroll);
      window.removeEventListener("blur", stopMiddleDragScroll);
    };

    middleDragRef.current.animationFrame = window.requestAnimationFrame(scrollFrame);
    window.addEventListener("mousemove", scrollOnMove, { passive: false });
    window.addEventListener("mouseup", stopMiddleDragScroll);
    window.addEventListener("blur", stopMiddleDragScroll);
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
    const rangeElement = getRangeContainerElement(range?.commonAncestorContainer ?? null);
    const messageElement = rangeElement?.closest<HTMLElement>("[data-message-content]");
    const sourceRange =
      range && messageElement && element.contains(messageElement)
        ? getSourceRangeInElement(messageElement, range) ??
          getTextRangeInElement(messageElement, range) ??
          findSourceRange(message.content, selected)
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
    if (isBlocked) return;
    const position = findFollowupNodePosition(node, state.snapshot?.nodes ?? [], getPlacementViewport());
    void sendCommand(
      commands.createNodeFromSelection({
        sourceNodeId: node.id,
        sourceMessageId: selection.message.id,
        sourceQuote: selection.quote,
        sourceRangeStart: selection.start,
        sourceRangeEnd: selection.end,
        x: position.x,
        y: position.y
      })
    );
    setSelection(null);
  }

  function toggleBranch(branchNode: CanvasNode) {
    if (isBlocked) return;
    if (branchNode.hiddenAt) {
      void sendCommand(commands.restoreNodeBranch(branchNode.id));
      return;
    }
    void sendCommand(commands.hideNodeSubtree(branchNode.id, branchNode.scrollTop));
  }

  return (
    <div
      ref={listRef}
      className={`message-list nodrag${canScroll ? " nowheel nopan" : ""}`}
      data-testid="message-list"
      onMouseDownCapture={startMiddleDragScroll}
      onScroll={updateStickiness}
    >
      {messages.map(message => (
        <article
          key={message.id}
          className={`message-bubble message-${message.role}`}
          onMouseUp={() => captureSelection(message)}
          data-message-content
        >
          <MessageContent
            message={message}
            branchNodes={(state.snapshot?.nodes ?? []).filter(node => node.sourceMessageId === message.id && !node.deletedAt)}
            onToggleBranch={toggleBranch}
            streamingLabel={appMessages.chat.thinking}
          />
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
  onToggleBranch,
  streamingLabel
}: {
  message: NodeMessage;
  branchNodes: CanvasNode[];
  onToggleBranch(node: CanvasNode): void;
  streamingLabel: string;
}) {
  const content = message.content || (message.status === "streaming" ? streamingLabel : "");
  return <MessageMarkdown content={content} branches={branchNodes} onToggleBranch={onToggleBranch} />;
}
