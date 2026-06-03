type SubmitLoginFormInput = {
  authenticate(): Promise<void>;
  fallbackError: string;
  invalidCredentialsError: string;
};

type SubmitLoginFormResult =
  | {
      error: "";
    }
  | {
      error: string;
    };

export async function submitLoginForm({
  authenticate,
  fallbackError,
  invalidCredentialsError
}: SubmitLoginFormInput): Promise<SubmitLoginFormResult> {
  try {
    await authenticate();
    return { error: "" };
  } catch (caught) {
    if (caught instanceof Error) {
      return { error: normalizeLoginError(caught.message, invalidCredentialsError) };
    }
    return { error: fallbackError };
  }
}

function normalizeLoginError(message: string, invalidCredentialsError: string): string {
  return message === "Invalid email or password." ? invalidCredentialsError : message;
}
