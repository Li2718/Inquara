import type { WorkspaceEvent } from "./events";
import type { WorkspaceSnapshot } from "./schemas";

export function applyWorkspaceEvent(snapshot: WorkspaceSnapshot, event: WorkspaceEvent): WorkspaceSnapshot {
  if (event.version < snapshot.workspace.version) return snapshot;
  const isSameVersion = event.version === snapshot.workspace.version;
  const canApplySameVersionCreate =
    (event.type === "workspace.node.created" && !snapshot.nodes.some(node => node.id === event.node.id)) ||
    (event.type === "workspace.edge.created" && !snapshot.edges.some(edge => edge.id === event.edge.id)) ||
    (event.type === "workspace.message.created" && !snapshot.messages.some(message => message.id === event.message.id));
  const canApplySameVersionNodeUpdate =
    event.type === "workspace.node.updated" &&
    snapshot.nodes.some(node => node.id === event.node.id && node.updatedAt < event.node.updatedAt);
  const canApplySameVersionMessageUpdate =
    (event.type === "workspace.message.updated" || event.type === "workspace.message.failed") &&
    snapshot.messages.some(message => message.id === event.message.id && message.updatedAt < event.message.updatedAt);
  if (isSameVersion && !canApplySameVersionCreate && !canApplySameVersionNodeUpdate && !canApplySameVersionMessageUpdate) {
    return snapshot;
  }

  const workspace = { ...snapshot.workspace, version: event.version, updatedAt: event.createdAt };

  if (event.type === "workspace.node.created") {
    if (snapshot.nodes.some(node => node.id === event.node.id)) return snapshot;
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
    if (snapshot.edges.some(edge => edge.id === event.edge.id)) return snapshot;
    return { ...snapshot, workspace, edges: [...snapshot.edges, event.edge] };
  }

  if (event.type === "workspace.message.created") {
    if (snapshot.messages.some(message => message.id === event.message.id)) return snapshot;
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
