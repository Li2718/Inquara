"use client";

import type { CanvasNode } from "@inquara/domain";
import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, useStore, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { NodeChatPanel } from "../node-chat/NodeChatPanel";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import type { ChatFlowNode } from "./CanvasView";
import { clampNodeSize, type NodeSize } from "./nodeResize";

const hiddenHandleStyle = { opacity: 0, pointerEvents: "none" } as const;
function getSafeZoom(zoom: number) {
  if (!Number.isFinite(zoom) || zoom <= 0) return 1;
  return zoom;
}

export const CanvasNodeView = memo(function CanvasNodeView({ id, data }: NodeProps<ChatFlowNode>) {
  const { commands, sendCommand } = useWorkspaceSession();
  const updateNodeInternals = useUpdateNodeInternals();
  const zoom = useStore(state => state.transform[2]);
  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.title);
  const [draftSize, setDraftSize] = useState<NodeSize>(() => clampNodeSize({ width: data.width, height: data.height }));
  const menuRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<null | { pointerId: number; startX: number; startY: number; originWidth: number; originHeight: number }>(null);
  const canHideBranch = Boolean(data.parentNodeId);

  useEffect(() => {
    if (resizeRef.current) return;
    setDraftSize(clampNodeSize({ width: data.width, height: data.height }));
  }, [data.width, data.height]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [draftSize.height, draftSize.width, id, updateNodeInternals]);

  useEffect(() => {
    const resize = (event: globalThis.PointerEvent) => {
      const activeResize = resizeRef.current;
      if (!activeResize || activeResize.pointerId !== event.pointerId) return;
      const zoomScale = getSafeZoom(zoom);
      setDraftSize(
        clampNodeSize({
          width: activeResize.originWidth + (event.clientX - activeResize.startX) / zoomScale,
          height: activeResize.originHeight + (event.clientY - activeResize.startY) / zoomScale
        })
      );
    };

    const stopResize = (event: globalThis.PointerEvent) => {
      const activeResize = resizeRef.current;
      if (!activeResize || activeResize.pointerId !== event.pointerId) return;
      resizeRef.current = null;
      const zoomScale = getSafeZoom(zoom);
      const nextSize = clampNodeSize({
        width: activeResize.originWidth + (event.clientX - activeResize.startX) / zoomScale,
        height: activeResize.originHeight + (event.clientY - activeResize.startY) / zoomScale
      });
      setDraftSize(nextSize);
      if (nextSize.width !== data.width || nextSize.height !== data.height) {
        sendCommand(commands.updateNodeSize(id, nextSize));
      }
    };

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [commands, data.height, data.width, id, sendCommand, zoom]);

  useEffect(() => {
    if (!isDangerOpen) return;

    function closeFromOutside(event: globalThis.PointerEvent) {
      if (menuRef.current?.contains(event.target as Node)) return;
      setIsDangerOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDangerOpen(false);
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [isDangerOpen]);

  function hideNode() {
    const list = document.querySelector(`[data-node-id="${id}"] .message-list`);
    const scrollTop = list instanceof HTMLElement ? list.scrollTop : data.scrollTop;
    sendCommand(commands.hideNodeSubtree(id, scrollTop));
  }

  function deleteNode() {
    sendCommand(commands.deleteNodeSubtree(id));
    setIsDeleteDialogOpen(false);
    setIsDangerOpen(false);
  }

  function startRenaming() {
    setDraftTitle(data.title);
    setIsRenaming(true);
    setIsDangerOpen(false);
  }

  function finishRenaming() {
    const nextTitle = draftTitle.trim();
    setIsRenaming(false);
    if (!nextTitle || nextTitle === data.title) {
      setDraftTitle(data.title);
      return;
    }
    sendCommand(commands.renameNode(id, nextTitle));
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originWidth: draftSize.width,
      originHeight: draftSize.height
    };
  }

  const deleteDialog = isDeleteDialogOpen
    ? createPortal(
        <div className="modal-backdrop nodrag nowheel" role="presentation">
          <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby={`delete-node-${id}-title`}>
            <h2 id={`delete-node-${id}-title`}>Move chat to trash?</h2>
            <p>This will hide this chat and its branches until you restore them from Trash.</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="danger-button" onClick={deleteNode}>
                Move to trash
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
  const zoomScale = getSafeZoom(zoom);
  const nodeStyle = {
    width: draftSize.width,
    height: draftSize.height
  } as CSSProperties;
  const contentStyle = {
    width: draftSize.width * zoomScale,
    height: draftSize.height * zoomScale,
    transform: `scale(${1 / zoomScale})`
  } as CSSProperties;

  return (
    <section
      className="canvas-node"
      data-testid="canvas-node"
      data-node-id={id}
      data-position={`${Math.round(data.x)},${Math.round(data.y)}`}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} style={hiddenHandleStyle} />
      <div className="canvas-node-content" style={contentStyle}>
        <header className="canvas-node-header">
          <div className="canvas-node-title-row" ref={menuRef}>
            {isRenaming ? (
              <input
                className="node-title-input nodrag nowheel"
                value={draftTitle}
                autoFocus
                onChange={event => setDraftTitle(event.target.value)}
                onFocus={event => event.currentTarget.select()}
                onBlur={finishRenaming}
                onKeyDown={event => {
                  if (event.key === "Enter") event.currentTarget.blur();
                  if (event.key === "Escape") {
                    setDraftTitle(data.title);
                    setIsRenaming(false);
                  }
                }}
              />
            ) : (
              <strong>{data.title}</strong>
            )}
            <button
              type="button"
              className="icon-button node-menu-trigger nodrag"
              aria-label="More node actions"
              title="More actions"
              onClick={() => setIsDangerOpen(value => !value)}
            >
              ⋮
            </button>
            {isDangerOpen ? (
              <div className="node-actions-menu nodrag nowheel" role="menu" aria-label="Node actions">
                <button type="button" role="menuitem" onClick={startRenaming}>
                  Rename
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="danger-menu-item"
                  onClick={() => {
                    setIsDangerOpen(false);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
          <div className="canvas-node-actions">
            {canHideBranch ? (
              <button type="button" className="icon-button hide-branch-button" aria-label="Hide branch" title="Hide branch" onClick={hideNode}>
                ✓
              </button>
            ) : null}
          </div>
        </header>
        {!data.collapsed ? <NodeChatPanel node={data} /> : null}
        <button
          type="button"
          className="canvas-node-resize-handle nodrag nowheel"
          aria-label="Resize chat"
          title="Resize"
          onPointerDown={startResize}
        />
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} style={hiddenHandleStyle} />
      {deleteDialog}
    </section>
  );
});
