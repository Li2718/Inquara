"use client";

import { useEffect } from "react";
import "./../shared/styles.css";
import { ErrorScreen } from "../shared/components/product";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorScreen
          heading="The workspace hit a snag."
          message="The page could not finish loading. Try again, or return to the canvas from a fresh tab."
          onRetry={reset}
        />
      </body>
    </html>
  );
}
