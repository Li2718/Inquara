"use client";

import type { CanvasNode } from "@inquara/domain";
import { memo, useState } from "react";
import { createPortal } from "react-dom";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { NodeChatPanel } from "../node-chat/NodeChatPanel";
import { useWorkspaceSession } from "../workspace-session/WorkspaceSessionProvider";
import type { ChatFlowNode } from "./CanvasView";

const hiddenHandleStyle = { opacity: 0, pointerEvents: "none" } as const;

export const CanvasNodeView = memo(function CanvasNodeView({ id, data }: NodeProps<ChatFlowNode>) {
  const { commands, sendCommand } = useWorkspaceSession();
  const [isDangerOpen, setIsDangerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(data.title);
  const canHideBranch = Boolean(data.parentNodeId);

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

  return (
    <section className="canvas-node" data-testid="canvas-node" data-node-id={id} data-position={`${Math.round(data.x)},${Math.round(data.y)}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} style={hiddenHandleStyle} />
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
      <Handle type="source" position={Position.Right} isConnectable={false} style={hiddenHandleStyle} />
      {deleteDialog}
    </section>
  );
});
