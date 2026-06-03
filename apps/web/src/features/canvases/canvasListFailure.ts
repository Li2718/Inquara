import { ApiError } from "../../shared/api";

export type CanvasListFailureAction = "show-login" | "show-error-page";

export function getCanvasListFailureAction({
  error,
  requireLoginOnFailure
}: {
  error: unknown;
  requireLoginOnFailure: boolean;
}): CanvasListFailureAction {
  if (requireLoginOnFailure && error instanceof ApiError && error.status === 401) {
    return "show-login";
  }

  return "show-error-page";
}
