"use client";

import type { CanvasDebugSnapshot } from "./debugTypes";

type CanvasDebugPanelProps = CanvasDebugSnapshot;

export function CanvasDebugPanel({ canvasId, leaseState, pendingClientMutationCount, snapshot }: CanvasDebugPanelProps) {
  const nodes = snapshot?.nodes ?? [];
  const visibleNodes = nodes.filter(node => !node.hiddenAt && !node.deletedAt);
  const hiddenNodes = nodes.filter(node => node.hiddenAt && !node.deletedAt);
  const deletedNodes = nodes.filter(node => node.deletedAt);
  const firstRootNode = visibleNodes.find(node => !node.parentNodeId);

  return (
    <dl className="debug-panel-list" aria-label="Canvas session debug">
      <DebugRow label="Page" value="canvas" />
      <DebugRow label="Canvas" value={canvasId} />
      <DebugRow label="Lease" value={leaseState} />
      <DebugRow label="Nodes" value={String(nodes.length)} />
      <DebugRow label="Visible nodes" value={String(visibleNodes.length)} />
      <DebugRow label="Hidden nodes" value={String(hiddenNodes.length)} />
      <DebugRow label="Deleted nodes" value={String(deletedNodes.length)} />
      <DebugRow label="Edges" value={String(snapshot?.edges.length ?? 0)} />
      <DebugRow label="Messages" value={String(snapshot?.messages.length ?? 0)} />
      <DebugRow label="Pending mutations" value={String(pendingClientMutationCount)} />
      <DebugRow label="First root" value={firstRootNode?.id ?? "none"} />
    </dl>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="debug-panel-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
