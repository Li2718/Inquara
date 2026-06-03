export type ChatContextMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StreamHandlers = {
  onDelta(delta: string): Promise<void> | void;
};

export interface AIProvider {
  streamReply(messages: ChatContextMessage[], handlers: StreamHandlers): Promise<{ content: string; model: string }>;
  completeSmallTask(messages: ChatContextMessage[]): Promise<{ content: string; model: string }>;
}
