"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { CanvasDebugPanel } from "./CanvasDebugPanel.dev";
import type { DebugRootProps } from "./debugTypes";
import { DEBUG_MARKER } from "./debugGuards";
import { useDebugPageSnapshot } from "./debugPageStore.dev";

type DebugPlacement = "right-down" | "right-up" | "left-down" | "left-up";
type DebugPosition = { x: number; y: number };

const DEBUG_POSITION_STORAGE_KEY = "inquara.debug_position";
const DEBUG_OPEN_STORAGE_KEY = "inquara.debug_open";
const BUBBLE_WIDTH = 44;
const BUBBLE_HEIGHT = 44;
const SCREEN_GAP = 8;
const DRAG_CLICK_THRESHOLD = 5;

export function DebugRootDev(props: DebugRootProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DebugPosition>({ x: SCREEN_GAP, y: SCREEN_GAP });
  const [isDragging, setIsDragging] = useState(false);
  const pageSnapshot = useDebugPageSnapshot();
  const hasDragged = useRef(false);
  const latestPositionRef = useRef<DebugPosition>({ x: SCREEN_GAP, y: SCREEN_GAP });
  const dragRef = useRef<null | { pointerId: number; startX: number; startY: number; originX: number; originY: number }>(null);

  const updatePosition = (nextPosition: DebugPosition) => {
    latestPositionRef.current = nextPosition;
    setPosition(nextPosition);
  };

  useEffect(() => {
    const storedPosition = window.localStorage.getItem(DEBUG_POSITION_STORAGE_KEY);
    const storedOpen = window.localStorage.getItem(DEBUG_OPEN_STORAGE_KEY);

    if (storedPosition) {
      try {
        const parsed = JSON.parse(storedPosition) as { x?: unknown; y?: unknown };
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          updatePosition(clampPosition(parsed.x, parsed.y));
        } else {
          updatePosition(defaultPosition());
        }
      } catch {
        window.localStorage.removeItem(DEBUG_POSITION_STORAGE_KEY);
        updatePosition(defaultPosition());
      }
    } else {
      updatePosition(defaultPosition());
    }
    if (storedOpen === "true") setIsOpen(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DEBUG_OPEN_STORAGE_KEY, String(isOpen));
  }, [isOpen]);

  useEffect(() => {
    if (!isDragging) window.localStorage.setItem(DEBUG_POSITION_STORAGE_KEY, JSON.stringify(position));
  }, [isDragging, position]);

  useEffect(() => {
    const drag = (event: globalThis.PointerEvent) => {
      const activeDrag = dragRef.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - activeDrag.startX;
      const deltaY = event.clientY - activeDrag.startY;
      if (Math.abs(deltaX) > DRAG_CLICK_THRESHOLD || Math.abs(deltaY) > DRAG_CLICK_THRESHOLD) hasDragged.current = true;
      updatePosition(rawPosition(activeDrag.originX + deltaX, activeDrag.originY + deltaY));
    };

    const stopDrag = (event: globalThis.PointerEvent) => {
      if (dragRef.current?.pointerId !== event.pointerId) return;
      const settledPosition = settlePosition(latestPositionRef.current);
      dragRef.current = null;
      setIsDragging(false);
      updatePosition(settledPosition);
    };

    const clampOnResize = () => updatePosition(settlePosition(latestPositionRef.current));

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

  const placement = getPlacement(position);

  const startDrag = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    hasDragged.current = false;
    setIsDragging(true);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y
    };
  };

  const toggleOpen = () => {
    if (hasDragged.current) {
      hasDragged.current = false;
      return;
    }
    setIsOpen(value => !value);
  };

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

function clampPosition(x: number, y: number): DebugPosition {
  if (typeof window === "undefined") return { x, y };
  return {
    x: Math.min(Math.max(SCREEN_GAP, x), Math.max(SCREEN_GAP, window.innerWidth - BUBBLE_WIDTH - SCREEN_GAP)),
    y: Math.min(Math.max(SCREEN_GAP, y), Math.max(SCREEN_GAP, window.innerHeight - BUBBLE_HEIGHT - SCREEN_GAP))
  };
}

function defaultPosition(): DebugPosition {
  if (typeof window === "undefined") return { x: SCREEN_GAP, y: SCREEN_GAP };
  return {
    x: window.innerWidth - BUBBLE_WIDTH - SCREEN_GAP,
    y: SCREEN_GAP
  };
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
