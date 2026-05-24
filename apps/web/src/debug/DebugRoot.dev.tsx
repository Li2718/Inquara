import { CanvasDebugPanel } from "./CanvasDebugPanel.dev";
import type { DebugRootProps } from "./debugTypes";
import { DEBUG_MARKER } from "./debugGuards";

export function DebugRootDev(props: DebugRootProps) {
  return (
    <aside className="debug-root" data-debug-marker={DEBUG_MARKER} aria-label="Inquara debug panel">
      <details>
        <summary className="debug-floating-button">DEBUG</summary>
        <section className="debug-panel" aria-label="INQUARA DEBUG">
          <header>
            <strong>INQUARA DEBUG</strong>
          </header>
          {props.page === "canvas" ? <CanvasDebugPanel {...props} /> : null}
        </section>
      </details>
    </aside>
  );
}
