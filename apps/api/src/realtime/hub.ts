import type { WorkspaceEvent } from "@inquara/domain";
import type { WebSocket } from "ws";

export class WorkspaceHub {
  private readonly subscribers = new Map<string, Set<WebSocket>>();

  subscribe(workspaceId: string, socket: WebSocket): void {
    const sockets = this.subscribers.get(workspaceId) ?? new Set<WebSocket>();
    sockets.add(socket);
    this.subscribers.set(workspaceId, sockets);
  }

  unsubscribe(workspaceId: string, socket: WebSocket): void {
    const sockets = this.subscribers.get(workspaceId);
    if (!sockets) return;
    sockets.delete(socket);
    if (sockets.size === 0) {
      this.subscribers.delete(workspaceId);
    }
  }

  unsubscribeSocket(socket: WebSocket): void {
    for (const workspaceId of this.subscribers.keys()) {
      this.unsubscribe(workspaceId, socket);
    }
  }

  broadcast(workspaceId: string, event: WorkspaceEvent): void {
    const message = JSON.stringify({ type: "event", event });
    for (const socket of this.subscribers.get(workspaceId) ?? []) {
      if (socket.readyState === socket.OPEN) {
        socket.send(message);
      }
    }
  }

  subscriberCount(workspaceId: string): number {
    return this.subscribers.get(workspaceId)?.size ?? 0;
  }
}
