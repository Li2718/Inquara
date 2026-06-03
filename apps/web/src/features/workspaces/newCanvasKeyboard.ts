export type NewCanvasStarterKey = {
  isComposing: boolean;
  key: string;
  shiftKey: boolean;
};

export function shouldSubmitNewCanvasStarter(event: NewCanvasStarterKey): boolean {
  return event.key === "Enter" && !event.shiftKey && !event.isComposing;
}
