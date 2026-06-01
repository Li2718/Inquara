"use client";

import { useEffect } from "react";
import "./../shared/styles.css";
import { ErrorScreen } from "../shared/components/product";
import { LocaleProvider } from "../shared/locale/LocaleProvider";
import { DEFAULT_LOCALE } from "../shared/locale";
import { useLocale } from "../shared/locale/LocaleProvider";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <LocaleProvider initialLocale={DEFAULT_LOCALE}>
          <GlobalErrorContent onRetry={reset} />
        </LocaleProvider>
      </body>
    </html>
  );
}

function GlobalErrorContent({ onRetry }: { onRetry: () => void }) {
  const { messages } = useLocale();

  return (
    <ErrorScreen
      heading={messages.error.globalHeading}
      message={messages.error.globalMessage}
      onRetry={onRetry}
    />
  );
}
