import { describe, expect, it } from "vitest";
import { ApiError } from "../../shared/api";
import { getCanvasListFailureAction } from "./canvasListFailure";

describe("canvas list failure handling", () => {
  it("shows login only for initial unauthorized canvas loading", () => {
    expect(
      getCanvasListFailureAction({
        error: new ApiError("Unauthorized", 401),
        requireLoginOnFailure: true
      })
    ).toBe("show-login");
  });

  it("uses the error boundary for non-auth canvas loading failures", () => {
    expect(
      getCanvasListFailureAction({
        error: new ApiError("Internal Server Error", 500),
        requireLoginOnFailure: true
      })
    ).toBe("show-error-page");
  });

  it("uses the error boundary after authentication succeeds", () => {
    expect(
      getCanvasListFailureAction({
        error: new ApiError("Unauthorized", 401),
        requireLoginOnFailure: false
      })
    ).toBe("show-error-page");
  });
});
