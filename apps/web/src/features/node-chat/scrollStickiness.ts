export function isScrolledNearBottom(element: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">, threshold = 24) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

export function stickToBottom(element: Pick<HTMLElement, "scrollHeight" | "scrollTop">) {
  element.scrollTop = element.scrollHeight;
}
