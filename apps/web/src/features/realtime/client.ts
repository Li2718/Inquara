import { WorkspaceCommandSchema, WorkspaceEventSchema, type WorkspaceCommand, type WorkspaceEvent } from "@inquara/domain";

const WS_ORIGIN = process.env.NEXT_PUBLIC_WS_ORIGIN || "";

export type RealtimeClient = {
  sendCommand(command: WorkspaceCommand): boolean;
  close(): void;
};

export type RealtimeClientOptions = {
  workspaceId: string;
  onEvent(event: WorkspaceEvent): void;
  onStatusChange?(status: "connecting" | "connected" | "disconnected"): void;
  onError?(message: string): void;
};

export function createRealtimeClient(options: RealtimeClientOptions): RealtimeClient {
  const socket = new WebSocket(resolveRealtimeUrl());
  options.onStatusChange?.("connecting");

  socket.addEventListener("open", () => {
    options.onStatusChange?.("connected");
    socket.send(JSON.stringify({ type: "subscribe", workspaceId: options.workspaceId }));
  });

  socket.addEventListener("message", event => {
    const parsed = JSON.parse(event.data.toString());
    if (parsed.type === "event") {
      options.onEvent(WorkspaceEventSchema.parse(parsed.event));
      return;
    }
    if (parsed.type === "error") {
      options.onError?.(String(parsed.error ?? "Realtime error."));
    }
  });

  socket.addEventListener("close", () => options.onStatusChange?.("disconnected"));
  socket.addEventListener("error", () => options.onStatusChange?.("disconnected"));

  return {
    sendCommand(command) {
      if (socket.readyState !== WebSocket.OPEN) {
        options.onStatusChange?.("disconnected");
        return false;
      }
      const parsedCommand = WorkspaceCommandSchema.parse(command);
      socket.send(JSON.stringify({ type: "command", command: parsedCommand }));
      return true;
    },
    close() {
      socket.close();
    }
  };
}

function resolveRealtimeUrl(): string {
  if (WS_ORIGIN) return `${WS_ORIGIN}/realtime`;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/realtime`;
}
