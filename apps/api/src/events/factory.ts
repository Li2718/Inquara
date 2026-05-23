import type { CanvasEdge, CanvasNode, NodeMessage, WorkspaceEvent } from "@inquara/domain";

export type EventBaseInput = {
  workspaceId: string;
  version: number;
  clientMutationId: string | null;
};

export function createNodeCreatedEvent(input: EventBaseInput & { node: CanvasNode }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.node.created", input),
    node: input.node
  };
}

export function createNodeUpdatedEvent(input: EventBaseInput & { node: CanvasNode }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.node.updated", input),
    node: input.node
  };
}

export function createEdgeCreatedEvent(input: EventBaseInput & { edge: CanvasEdge }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.edge.created", input),
    edge: input.edge
  };
}

export function createMessageCreatedEvent(input: EventBaseInput & { message: NodeMessage }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.message.created", input),
    message: input.message
  };
}

export function createMessageDeltaEvent(input: EventBaseInput & { messageId: string; delta: string }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.message.delta", input),
    messageId: input.messageId,
    delta: input.delta
  };
}

export function createMessageUpdatedEvent(input: EventBaseInput & { message: NodeMessage }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.message.updated", input),
    message: input.message
  };
}

export function createMessageFailedEvent(input: EventBaseInput & { message: NodeMessage }): WorkspaceEvent {
  return {
    ...baseEvent("workspace.message.failed", input),
    message: input.message
  };
}

function baseEvent<TType extends WorkspaceEvent["type"]>(type: TType, input: EventBaseInput) {
  return {
    id: `event-${crypto.randomUUID()}`,
    type,
    workspaceId: input.workspaceId,
    version: input.version,
    clientMutationId: input.clientMutationId,
    createdAt: new Date().toISOString()
  };
}
