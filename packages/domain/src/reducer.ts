import type { WorkspaceEvent } from "./events";
import type { WorkspaceSnapshot } from "./schemas";

export function applyWorkspaceEvent(snapshot: WorkspaceSnapshot, event: WorkspaceEvent): WorkspaceSnapshot {
  if (event.version <= snapshot.workspace.version) return snapshot;

  const workspace = { ...snapshot.workspace, version: event.version, updatedAt: event.createdAt };

  if (event.type === "workspace.node.created") {
    return { ...snapshot, workspace, nodes: [...snapshot.nodes, event.node] };
  }

  if (event.type === "workspace.node.updated") {
    return {
      ...snapshot,
      workspace,
      nodes: snapshot.nodes.map(node => (node.id === event.node.id ? event.node : node))
    };
  }

  if (event.type === "workspace.edge.created") {
    return { ...snapshot, workspace, edges: [...snapshot.edges, event.edge] };
  }

  if (event.type === "workspace.message.created") {
    return { ...snapshot, workspace, messages: [...snapshot.messages, event.message] };
  }

  if (event.type === "workspace.message.delta") {
    return {
      ...snapshot,
      workspace,
      messages: snapshot.messages.map(message =>
        message.id === event.messageId ? { ...message, content: message.content + event.delta } : message
      )
    };
  }

  if (event.type === "workspace.message.updated" || event.type === "workspace.message.failed") {
    return {
      ...snapshot,
      workspace,
      messages: snapshot.messages.map(message => (message.id === event.message.id ? event.message : message))
    };
  }

  return snapshot;
}
