const API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN || "/api";

const DEFAULT_API_ERROR_MESSAGE = "Something went wrong. Please try again.";

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    credentials: "include",
    headers
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readApiErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as unknown;
      if (isErrorBody(body)) return body.error;
    } catch {
      return DEFAULT_API_ERROR_MESSAGE;
    }
  }
  return DEFAULT_API_ERROR_MESSAGE;
}

function isErrorBody(value: unknown): value is { error: string } {
  return Boolean(
    value &&
      typeof value === "object" &&
      "error" in value &&
      typeof (value as { error?: unknown }).error === "string"
  );
}
