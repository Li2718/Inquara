"use client";

import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { Handle, Position, useStore, useUpdateNodeInternals, type NodeProps } from "@xyflow/react";
import { CheckIcon, ConfirmDialog, IconButton, MoreVerticalIcon, PopupMenu, PopupMenuItem } from "../../shared/components/ui";
import { useLocale } from "../../shared/locale/LocaleProvider";
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
  const { messages } = useLocale();
  const copy = messages.node;
  const { commands, sendCommand, state } = useWorkspaceSession();
  const updateNodeInternals = useUpdateNodeInternals();
  const zoom = useStore(state => state.transform[2]);
  const isBlocked = state.leaseState !== "active";
  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.title);
  const [draftSize, setDraftSize] = useState<NodeSize>(() => clampNodeSize({ width: data.width, height: data.height }));
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
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
      if (!isBlocked && (nextSize.width !== data.width || nextSize.height !== data.height)) {
        void sendCommand(commands.updateNodeSize(id, nextSize));
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
  }, [commands, data.height, data.width, id, isBlocked, sendCommand, zoom]);

  function hideNode() {
    if (isBlocked) return;
    const list = document.querySelector(`[data-node-id="${id}"] .message-list`);
    const scrollTop = list instanceof HTMLElement ? list.scrollTop : data.scrollTop;
    void sendCommand(commands.hideNodeSubtree(id, scrollTop));
  }

  function deleteNode() {
    if (isBlocked) return;
    void sendCommand(commands.deleteNodeSubtree(id));
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
    if (isBlocked) return;
    void sendCommand(commands.renameNode(id, nextTitle));
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (isBlocked) return;
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
      className={[
        "canvas-node",
        data.isAppearing ? "canvas-node-appearing" : "",
        data.isExiting ? "canvas-node-exiting" : ""
      ].filter(Boolean).join(" ")}
      data-testid="canvas-node"
      data-node-id={id}
      data-position={`${Math.round(data.x)},${Math.round(data.y)}`}
      style={nodeStyle}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} style={hiddenHandleStyle} />
      <div className="canvas-node-content" style={contentStyle}>
        <header className="canvas-node-header">
          <div className="canvas-node-title-row">
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
            <IconButton
              ref={menuTriggerRef}
              className="node-menu-trigger nodrag"
              aria-label={copy.moreActions}
              title={copy.moreActions}
              disabled={isBlocked}
              onClick={() => setIsDangerOpen(value => !value)}
            >
              <MoreVerticalIcon />
            </IconButton>
            <PopupMenu
              className="node-actions-menu nodrag nowheel"
              aria-label={copy.actions}
              ignoreRef={menuTriggerRef}
              isOpen={isDangerOpen}
              onClose={() => setIsDangerOpen(false)}
            >
              <PopupMenuItem onClick={startRenaming}>
                {copy.rename}
              </PopupMenuItem>
              <PopupMenuItem
                tone="danger"
                onClick={() => {
                  setIsDangerOpen(false);
                  setIsDeleteDialogOpen(true);
                }}
              >
                {copy.delete}
              </PopupMenuItem>
            </PopupMenu>
          </div>
          <div className="canvas-node-actions">
            {canHideBranch ? (
              <IconButton
                className="hide-branch-button"
                aria-label={copy.hideBranch}
                title={copy.hideBranch}
                disabled={isBlocked}
                onClick={hideNode}
              >
                <CheckIcon />
              </IconButton>
            ) : null}
          </div>
        </header>
        {!data.collapsed ? <NodeChatPanel node={data} /> : null}
        <button
          type="button"
          className="canvas-node-resize-handle nodrag nowheel"
          aria-label={copy.resizeChat}
          title={copy.resize}
          disabled={isBlocked}
          onPointerDown={startResize}
        />
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} style={hiddenHandleStyle} />
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={copy.moveToTrash}
        description={copy.moveToTrashDescription}
        confirmLabel={copy.moveToTrashConfirm}
        confirmTone="danger"
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={deleteNode}
      />
    </section>
  );
});
