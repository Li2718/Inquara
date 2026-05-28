"use client";

import { createContext, useContext } from "react";
import type { PlacementViewport } from "../node-chat/branchPlacement";

type CanvasViewportContextValue = {
  getPlacementViewport(): PlacementViewport | undefined;
};

const CanvasViewportContext = createContext<CanvasViewportContextValue>({
  getPlacementViewport: () => undefined
});

export const CanvasViewportProvider = CanvasViewportContext.Provider;

export function useCanvasPlacementViewportGetter() {
  return useContext(CanvasViewportContext);
}
