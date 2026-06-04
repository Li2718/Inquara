"use client";

import type { Canvas } from "@inquara/domain";
import { FormEvent, MouseEvent, useEffect, useRef, useState } from "react";
import { apiJson } from "../../shared/api";
import { PageTransitionLink } from "../../shared/components/chrome";
import {
  Button,
  ConfirmDialog,
  LoadingState,
  MoreVerticalIcon,
  PlusIcon,
  PopupMenu,
  PopupMenuItem,
  SkeletonBlock,
  SidebarCollapseIcon,
  SidebarPanelIcon
} from "../../shared/components/ui";
import { formatDate } from "../../shared/format";
import { useLocale } from "../../shared/locale/LocaleProvider";
import { interpolate, type AppMessages } from "../../shared/messages";
import { getCanvasDeleteDialogOpeningState } from "./canvasDeleteDialogState";
import { upsertCanvasList, type CanvasListPlacement } from "./canvasListState";

type CanvasSidebarProps = {
  canvasListUpdate: { canvas: Canvas; placement: CanvasListPlacement } | null;
  currentCanvasId: string;
  isOpen: boolean;
  onNewCanvasRequest(): void;
  onToggle(): void;
  onCanvasNavigate(targetCanvasId: string, options?: { replace?: boolean }): Promise<void>;
};

let canvasListCache: Canvas[] | null = null;
const CANVAS_SIDEBAR_TRANSITION_MS = 220;

export function CanvasSidebar({
  canvasListUpdate,
  currentCanvasId,
  isOpen,
  onNewCanvasRequest,
  onToggle,
  onCanvasNavigate
}: CanvasSidebarProps) {
  const { locale, messages } = useLocale();
  const copy = messages.canvasSidebar;
  const [canvases, setCanvases] = useState<Canvas[]>(() => canvasListCache ?? []);
  const [isLoading, setIsLoading] = useState(canvasListCache === null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [deletingCanvas, setDeletingCanvas] = useState<Canvas | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      return;
    }
    setIsClosing(true);
    const timeout = window.setTimeout(() => setIsClosing(false), CANVAS_SIDEBAR_TRANSITION_MS);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    void loadCanvases({ showLoading: canvasListCache === null });
  }, []);

  useEffect(() => {
    if (!canvasListUpdate) return;
    setCanvases(previous => {
      const nextCanvases = upsertCanvasList(previous, canvasListUpdate.canvas, { placement: canvasListUpdate.placement });
      canvasListCache = nextCanvases;
      return nextCanvases;
    });
  }, [canvasListUpdate]);

  async function loadCanvases({ showLoading }: { showLoading: boolean }) {
    if (showLoading) setIsLoading(true);
    setError("");
    try {
      const nextCanvases = await apiJson<Canvas[]>("/canvases");
      canvasListCache = nextCanvases;
      setCanvases(nextCanvases);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotLoad);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  function createCanvas() {
    setError("");
    onNewCanvasRequest();
  }

  function startRenaming(canvas: Canvas) {
    setActiveMenuId(null);
    setRenamingId(canvas.id);
    setRenameTitle(canvas.title);
    setError("");
  }

  function openDeleteDialog(canvas: Canvas) {
    const nextState = getCanvasDeleteDialogOpeningState(canvas);
    setActiveMenuId(nextState.activeMenuId);
    setIsDeleting(nextState.isDeleting);
    setDeletingCanvas(nextState.deletingCanvas);
  }

  async function submitRename(event: FormEvent<HTMLFormElement>, canvas: Canvas) {
    event.preventDefault();
    const title = renameTitle.trim();
    if (!title) return;
    setError("");
    try {
      const updated = await apiJson<Canvas>(`/canvases/${canvas.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title })
      });
      setCanvases(previous => {
        const nextCanvases = previous.map(item => (item.id === updated.id ? updated : item));
        canvasListCache = nextCanvases;
        return nextCanvases;
      });
      setRenamingId(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotRename);
    }
  }

  async function confirmDeleteCanvas() {
    if (!deletingCanvas) return;
    setIsDeleting(true);
    setError("");
    try {
      await apiJson<void>(`/canvases/${deletingCanvas.id}`, { method: "DELETE" });
      const nextCanvases = canvases.filter(item => item.id !== deletingCanvas.id);
      canvasListCache = nextCanvases;
      setCanvases(nextCanvases);
      setDeletingCanvas(null);
      if (deletingCanvas.id === currentCanvasId) {
        const nextCanvas = nextCanvases[0];
        if (nextCanvas) {
          await onCanvasNavigate(nextCanvas.id, { replace: true });
        } else {
          onNewCanvasRequest();
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.couldNotDelete);
      setIsDeleting(false);
    }
  }

  return (
    <aside className="canvas-sidebar" data-open={isOpen} data-closing={isClosing} aria-label={copy.canvasNavigation}>
      <button
        type="button"
        className="canvas-sidebar-morph-button"
        onClick={onToggle}
        aria-label={isOpen ? copy.collapseSidebar : copy.openSidebar}
        aria-expanded={isOpen}
      >
        <SidebarPanelIcon />
      </button>

      <div className="canvas-sidebar-content" aria-hidden={!isOpen}>
        <header className="canvas-sidebar-header">
          <button type="button" className="canvas-sidebar-title-button" onClick={onToggle} aria-label={copy.collapseSidebar}>
            <h2>{copy.canvases}</h2>
          </button>
          <button
            type="button"
            className="canvas-sidebar-create-button"
            onClick={createCanvas}
            aria-label={copy.newCanvas}
          >
            <PlusIcon />
          </button>
          <button type="button" className="canvas-sidebar-collapse-button" onClick={onToggle} aria-label={copy.collapseSidebar}>
            <SidebarCollapseIcon />
          </button>
        </header>

        <div className="canvas-sidebar-list" aria-label={copy.canvasList}>
          {isLoading ? (
            <div className="canvas-sidebar-loading">
              <LoadingState variant="inline" aria-label={copy.loadingCanvases} />
              <SkeletonBlock variant="list" rows={3} />
            </div>
          ) : null}
          {!isLoading && canvases.length === 0 ? (
            <p className="canvas-sidebar-note">{copy.noCanvases}</p>
          ) : null}
          {canvases.map(canvas => (
            <CanvasSidebarItem
              key={canvas.id}
              activeMenuId={activeMenuId}
              currentCanvasId={currentCanvasId}
              onMenuToggle={setActiveMenuId}
              onRename={startRenaming}
              onCanvasNavigate={onCanvasNavigate}
              locale={locale}
              messages={messages}
              renamingId={renamingId}
              renameTitle={renameTitle}
              openDeleteDialog={openDeleteDialog}
              setRenameTitle={setRenameTitle}
              setRenamingId={setRenamingId}
              submitRename={submitRename}
              canvas={canvas}
            />
          ))}
        </div>

        {error ? <p className="error-text">{error}</p> : null}
      </div>
      <ConfirmDialog
        isOpen={Boolean(deletingCanvas)}
        title={copy.deleteCanvas}
        description={deletingCanvas ? interpolate(copy.deleteDescription, { title: deletingCanvas.title }) : undefined}
        confirmLabel={isDeleting ? messages.common.deleting : messages.common.delete}
        confirmTone="danger"
        isConfirming={isDeleting}
        onCancel={() => setDeletingCanvas(null)}
        onConfirm={confirmDeleteCanvas}
      />
    </aside>
  );
}

function CanvasSidebarItem({
  activeMenuId,
  currentCanvasId,
  onMenuToggle,
  onRename,
  onCanvasNavigate,
  locale,
  messages,
  openDeleteDialog,
  renamingId,
  renameTitle,
  setRenameTitle,
  setRenamingId,
  submitRename,
  canvas
}: {
  activeMenuId: string | null;
  currentCanvasId: string;
  onMenuToggle(activeMenuId: string | null): void;
  onRename(canvas: Canvas): void;
  onCanvasNavigate(targetCanvasId: string, options?: { replace?: boolean }): Promise<void>;
  openDeleteDialog(canvas: Canvas): void;
  locale: ReturnType<typeof useLocale>["locale"];
  messages: AppMessages;
  renamingId: string | null;
  renameTitle: string;
  setRenameTitle(title: string): void;
  setRenamingId(canvasId: string | null): void;
  submitRename(event: FormEvent<HTMLFormElement>, canvas: Canvas): Promise<void>;
  canvas: Canvas;
}) {
  const isMenuOpen = activeMenuId === canvas.id;
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const copy = messages.canvasSidebar;

  return (
    <div className="canvas-sidebar-item-shell">
      {renamingId === canvas.id ? (
        <form className="canvas-sidebar-rename-form" onSubmit={event => submitRename(event, canvas)}>
          <input
            value={renameTitle}
            onChange={event => setRenameTitle(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") setRenamingId(null);
            }}
            maxLength={120}
            autoFocus
            required
          />
          <Button type="submit">{copy.save}</Button>
        </form>
      ) : (
        <>
          <PageTransitionLink
            className="canvas-sidebar-item"
            data-active={canvas.id === currentCanvasId}
            href={`/canvases/${canvas.id}`}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              if (canvas.id === currentCanvasId) return;
              event.preventDefault();
              void onCanvasNavigate(canvas.id);
            }}
          >
            <strong>{canvas.title}</strong>
            <span>{formatDate(locale, canvas.updatedAt)}</span>
          </PageTransitionLink>
          <button
            ref={menuTriggerRef}
            type="button"
            className="canvas-sidebar-item-menu-trigger"
            onClick={() => onMenuToggle(isMenuOpen ? null : canvas.id)}
            aria-label={interpolate(copy.canvasActions, { title: canvas.title })}
            aria-expanded={isMenuOpen}
          >
            <MoreVerticalIcon />
          </button>
          <PopupMenu
            className="canvas-sidebar-item-menu"
            aria-label={interpolate(copy.canvasActions, { title: canvas.title })}
            ignoreRef={menuTriggerRef}
            isOpen={isMenuOpen}
            onClose={() => onMenuToggle(null)}
          >
            <PopupMenuItem onClick={() => onRename(canvas)}>
              {copy.rename}
            </PopupMenuItem>
            <PopupMenuItem
              tone="danger"
              onClick={() => {
                openDeleteDialog(canvas);
              }}
            >
              {messages.common.delete}
            </PopupMenuItem>
          </PopupMenu>
        </>
      )}
    </div>
  );
}
