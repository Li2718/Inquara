import type { CanvasEvent } from "./events";
import type { CanvasSnapshot } from "./schemas";

export function applyCanvasEvent(snapshot: CanvasSnapshot, event: CanvasEvent): CanvasSnapshot {
  if (event.version < snapshot.canvas.version) return snapshot;
  const isSameVersion = event.version === snapshot.canvas.version;
  const canApplySameVersionCreate =
    (event.type === "canvas.node.created" && !snapshot.nodes.some(node => node.id === event.node.id)) ||
    (event.type === "canvas.edge.created" && !snapshot.edges.some(edge => edge.id === event.edge.id)) ||
    (event.type === "canvas.message.created" && !snapshot.messages.some(message => message.id === event.message.id));
  const canApplySameVersionNodeUpdate =
    event.type === "canvas.node.updated" &&
    snapshot.nodes.some(node => node.id === event.node.id && node.updatedAt < event.node.updatedAt);
  const canApplySameVersionMessageUpdate =
    (event.type === "canvas.message.updated" || event.type === "canvas.message.failed") &&
    snapshot.messages.some(message => message.id === event.message.id && message.updatedAt < event.message.updatedAt);
  if (isSameVersion && !canApplySameVersionCreate && !canApplySameVersionNodeUpdate && !canApplySameVersionMessageUpdate) {
    return snapshot;
  }

  const canvas = { ...snapshot.canvas, version: event.version, updatedAt: event.createdAt };

  if (event.type === "canvas.node.created") {
    if (snapshot.nodes.some(node => node.id === event.node.id)) return snapshot;
    return { ...snapshot, canvas, nodes: [...snapshot.nodes, event.node] };
  }

  if (event.type === "canvas.node.updated") {
    return {
      ...snapshot,
      canvas,
      nodes: snapshot.nodes.map(node => (node.id === event.node.id ? event.node : node))
    };
  }

  if (event.type === "canvas.edge.created") {
    if (snapshot.edges.some(edge => edge.id === event.edge.id)) return snapshot;
    return { ...snapshot, canvas, edges: [...snapshot.edges, event.edge] };
  }

  if (event.type === "canvas.message.created") {
    if (snapshot.messages.some(message => message.id === event.message.id)) return snapshot;
    return { ...snapshot, canvas, messages: [...snapshot.messages, event.message] };
  }

  if (event.type === "canvas.message.delta") {
    return {
      ...snapshot,
      canvas,
      messages: snapshot.messages.map(message =>
        message.id === event.messageId ? { ...message, content: message.content + event.delta } : message
      )
    };
  }

  if (event.type === "canvas.message.updated" || event.type === "canvas.message.failed") {
    return {
      ...snapshot,
      canvas,
      messages: snapshot.messages.map(message => (message.id === event.message.id ? event.message : message))
    };
  }

  return snapshot;
}
