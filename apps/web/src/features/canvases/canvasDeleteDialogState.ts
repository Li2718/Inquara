type CanvasDeleteDialogCanvas = {
  id: string;
  title: string;
};

export function getCanvasDeleteDialogOpeningState<CanvasType extends CanvasDeleteDialogCanvas>(canvas: CanvasType) {
  return {
    activeMenuId: null,
    deletingCanvas: canvas,
    isDeleting: false
  };
}
