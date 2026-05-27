export function isScrolledNearBottom(element: Pick<HTMLElement, "scrollHeight" | "scrollTop" | "clientHeight">, threshold = 24) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold;
}

export function hasScrollableOverflow(element: Pick<HTMLElement, "scrollHeight" | "clientHeight">) {
  return element.scrollHeight > element.clientHeight + 1;
}

export function getMiddleDragScrollVelocity(offsetY: number, deadZone = 8, maxVelocity = 24) {
  const distance = Math.abs(offsetY);
  if (distance <= deadZone) return 0;
  return Math.sign(offsetY) * Math.min((distance - deadZone) * 0.18, maxVelocity);
}

export function stickToBottom(element: Pick<HTMLElement, "scrollHeight" | "scrollTop">) {
  element.scrollTop = element.scrollHeight;
}
