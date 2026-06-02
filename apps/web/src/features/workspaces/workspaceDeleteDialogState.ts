type WorkspaceDeleteDialogWorkspace = {
  id: string;
  title: string;
};

export function getWorkspaceDeleteDialogOpeningState<WorkspaceType extends WorkspaceDeleteDialogWorkspace>(workspace: WorkspaceType) {
  return {
    activeMenuId: null,
    deletingWorkspace: workspace,
    isDeleting: false
  };
}
