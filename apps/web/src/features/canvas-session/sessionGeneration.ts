export type SessionGeneration = {
  current: number;
};

export function createSessionGeneration(): SessionGeneration {
  return { current: 0 };
}

export function advanceSessionGeneration(generation: SessionGeneration): number {
  generation.current += 1;
  return generation.current;
}

export function isCurrentSessionGeneration(generation: SessionGeneration, token: number): boolean {
  return generation.current === token;
}
