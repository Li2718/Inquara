export function getCanvasRenameFormState({
  canvasId,
  savingCanvasId
}: {
  canvasId: string;
  savingCanvasId: string | null;
}): { isSaving: boolean; isDisabled: boolean } {
  const isSaving = savingCanvasId === canvasId;

  return {
    isDisabled: isSaving,
    isSaving
  };
}
