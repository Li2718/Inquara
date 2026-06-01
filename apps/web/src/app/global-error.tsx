"use client";

import { useEffect } from "react";
import "./../shared/styles.css";
import { ErrorScreen } from "../shared/components/product";
import { LocaleProvider } from "../shared/locale/LocaleProvider";
import { DEFAULT_LOCALE } from "../shared/locale";
import { getMessages } from "../shared/messages";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const messages = getMessages(DEFAULT_LOCALE);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <LocaleProvider initialLocale={DEFAULT_LOCALE}>
          <ErrorScreen
            heading={messages.error.globalHeading}
            message={messages.error.globalMessage}
            onRetry={reset}
          />
        </LocaleProvider>
      </body>
    </html>
  );
}
