import type { Canvas, CanvasEdge, CanvasNode, NodeMessage, CanvasEvent } from "@inquara/domain";

export type EventBaseInput = {
  canvasId: string;
  version: number;
  clientMutationId: string | null;
};

export function createNodeCreatedEvent(input: EventBaseInput & { node: CanvasNode }): CanvasEvent {
  return {
    ...baseEvent("canvas.node.created", input),
    node: input.node
  };
}

export function createCanvasUpdatedEvent(input: EventBaseInput & { canvas: Canvas }): CanvasEvent {
  return {
    ...baseEvent("canvas.updated", input),
    canvas: input.canvas
  };
}

export function createNodeUpdatedEvent(input: EventBaseInput & { node: CanvasNode }): CanvasEvent {
  return {
    ...baseEvent("canvas.node.updated", input),
    node: input.node
  };
}

export function createEdgeCreatedEvent(input: EventBaseInput & { edge: CanvasEdge }): CanvasEvent {
  return {
    ...baseEvent("canvas.edge.created", input),
    edge: input.edge
  };
}

export function createMessageCreatedEvent(input: EventBaseInput & { message: NodeMessage }): CanvasEvent {
  return {
    ...baseEvent("canvas.message.created", input),
    message: input.message
  };
}

export function createMessageDeltaEvent(input: EventBaseInput & { messageId: string; delta: string }): CanvasEvent {
  return {
    ...baseEvent("canvas.message.delta", input),
    messageId: input.messageId,
    delta: input.delta
  };
}

export function createMessageUpdatedEvent(input: EventBaseInput & { message: NodeMessage }): CanvasEvent {
  return {
    ...baseEvent("canvas.message.updated", input),
    message: input.message
  };
}

export function createMessageFailedEvent(input: EventBaseInput & { message: NodeMessage }): CanvasEvent {
  return {
    ...baseEvent("canvas.message.failed", input),
    message: input.message
  };
}

function baseEvent<TType extends CanvasEvent["type"]>(type: TType, input: EventBaseInput) {
  return {
    id: `event-${crypto.randomUUID()}`,
    type,
    canvasId: input.canvasId,
    version: input.version,
    clientMutationId: input.clientMutationId,
    createdAt: new Date().toISOString()
  };
}
