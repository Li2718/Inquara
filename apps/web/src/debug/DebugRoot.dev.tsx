"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CanvasDebugPanel } from "./CanvasDebugPanel.dev";
import type { DebugRootProps } from "./debugTypes";
import { DEBUG_MARKER } from "./debugGuards";
import {
  BUBBLE_HEIGHT,
  BUBBLE_WIDTH,
  DEBUG_POSITION_STORAGE_KEY,
  SCREEN_GAP,
  adaptDebugPositionToViewport,
  clampDebugPosition,
  defaultDebugPosition,
  readStoredDebugPosition,
  shouldPersistDebugPosition,
  type DebugPosition,
  type DebugViewport
} from "./debugPosition";
import { useDebugPageSnapshot } from "./debugPageStore.dev";

type DebugPlacement = "right-down" | "right-up" | "left-down" | "left-up";

const DEBUG_OPEN_STORAGE_KEY = "inquara.debug_open";
const DRAG_CLICK_THRESHOLD = 5;

export function DebugRootDev(props: DebugRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DebugPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pageSnapshot = useDebugPageSnapshot();
  const hasDragged = useRef(false);
  const displayPositionRef = useRef<DebugPosition>(position ?? { x: SCREEN_GAP, y: SCREEN_GAP });
  const preferredPositionRef = useRef<DebugPosition>(position ?? { x: SCREEN_GAP, y: SCREEN_GAP });
  const viewportRef = useRef<DebugViewport | null>(null);
  const dragRef = useRef<null | { pointerId: number; startX: number; startY: number; originX: number; originY: number }>(null);

  const updatePosition = (nextPosition: DebugPosition) => {
    displayPositionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  const updatePreferredPosition = (nextPosition: DebugPosition) => {
    preferredPositionRef.current = nextPosition;
    updatePosition(nextPosition);
  };

  useEffect(() => {
    const storedOpen = window.localStorage.getItem(DEBUG_OPEN_STORAGE_KEY);

    if (!position) {
      viewportRef.current = currentViewport();
      updatePreferredPosition(readInitialPosition());
    }
    if (storedOpen === "true") setIsOpen(true);
  }, [position]);

  useEffect(() => {
    window.localStorage.setItem(DEBUG_OPEN_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    const drag = (event: globalThis.PointerEvent) => {
      const activeDrag = dragRef.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - activeDrag.startX;
      const deltaY = event.clientY - activeDrag.startY;
      if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD || Math.abs(deltaY) > DRAG_CLICK_THRESHOLD) hasDragged.current = true;
      updatePreferredPosition(rawPosition(activeDrag.originX + deltaX, activeDrag.originY + deltaY));
    };

    const stopDrag = (event: globalThis.PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      const settledPosition = settlePosition(preferredPositionRef.current);
      dragRef.current = null;
      setIsDragging(false);
      updatePreferredPosition(settledPosition);
      viewportRef.current = currentViewport();
      if (shouldPersistDebugPosition("drag-end")) {
        window.localStorage.setItem(DEBUG_POSITION_STORAGE_KEY, JSON.stringify(settledPosition));
      }
    };

    const clampOnResize = () => {
      const nextViewport = currentViewport();
      const previousViewport = viewportRef.current ?? nextViewport;
      const nextPreferredPosition = adaptDebugPositionToViewport(preferredPositionRef.current, previousViewport, nextViewport);
      viewportRef.current = nextViewport;
      preferredPositionRef.current = nextPreferredPosition;
      updatePosition(nextPreferredPosition);
    };

    window.addEventListener("pointermove", drag);
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    window.addEventListener("resize", clampOnResize);
    return () => {
      window.removeEventListener("pointermove", drag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
      window.removeEventListener("resize", clampOnResize);
    };
  }, []);

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    hasDragged.current = false;
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: displayPositionRef.current.x,
      originY: displayPositionRef.current.y
    };
  };

  const toggleOpen = () => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    setIsOpen(value => !value);
  };

  if (!position) return null;

  const placement = getPlacement(position);

  return (
    <aside
      className="debug-root"
      data-debug-marker={DEBUG_MARKER}
      data-debug-placement={placement}
      data-debug-dragging={isDragging}
      aria-label="Inquara debug panel"
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
    >
      <button
        type="button"
        className="debug-floating-button"
        aria-label={isOpen ? "Close debug panel" : "Open debug panel"}
        aria-expanded={isOpen}
        onPointerDown={startDrag}
        onClick={toggleOpen}
      >
        <span>D</span>
      </button>
      {isOpen ? (
        <section className="debug-panel" aria-label="INQUARA DEBUG">
          <header className="debug-panel-header">
            <span className="debug-panel-title">
              <strong>INQUARA DEBUG</strong>
            </span>
            <button type="button" aria-label="Close debug panel" onClick={() => setIsOpen(false)}>
              Close
            </button>
          </header>
          {pageSnapshot.page === "canvas" ? <CanvasDebugPanel {...pageSnapshot} /> : <GlobalDebugPanel page={props.page} />}
        </section>
      ) : null}
    </aside>
  );
}

function GlobalDebugPanel({ page }: DebugRootProps) {
  return (
    <dl className="debug-panel-list" aria-label="Global debug">
      <div className="debug-panel-row">
        <dt>Page</dt>
        <dd>{page}</dd>
      </div>
    </dl>
  );
}

function rawPosition(x: number, y: number): DebugPosition {
  return { x, y };
}

function readInitialPosition(): DebugPosition {
  const storedPosition = window.localStorage.getItem(DEBUG_POSITION_STORAGE_KEY);
  const restored = readStoredDebugPosition(storedPosition, currentViewport());
  if (storedPosition && !restored) window.localStorage.removeItem(DEBUG_POSITION_STORAGE_KEY);
  return restored ?? defaultDebugPosition(currentViewport());
}

function clampPosition(x: number, y: number): DebugPosition {
  return clampDebugPosition(x, y, currentViewport());
}

function settlePosition(position: DebugPosition): DebugPosition {
  return clampPosition(position.x, position.y);
}

function getPlacement(position: DebugPosition): DebugPlacement {
  if (typeof window === "undefined") return "right-down";
  const horizontal = position.x + BUBBLE_WIDTH / 2 < window.innerWidth / 2 ? "right" : "left";
  const vertical = position.y + BUBBLE_HEIGHT / 2 < window.innerHeight / 2 ? "down" : "up";
  return `${horizontal}-${vertical}` as DebugPlacement;
}

function currentViewport() {
  if (typeof window === "undefined") return { width: BUBBLE_WIDTH + SCREEN_GAP * 2, height: BUBBLE_HEIGHT + SCREEN_GAP * 2 };
  return { width: window.innerWidth, height: window.innerHeight };
}
