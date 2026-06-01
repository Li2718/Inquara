import type { Metadata } from "next";
import Script from "next/script";
import "katex/dist/katex.min.css";
import { DebugRoot } from "../debug/DebugRoot";
import { PageTransitionRoot } from "../shared/components/chrome";
import { getClientFatalErrorFallbackScript } from "../shared/components/product/clientFatalErrorFallback";
import "../shared/styles.css";

export const metadata: Metadata = {
  title: "Inquara",
  description: "AI canvas workspace",
  icons: {
    icon: [{ url: "/favicon-brand.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon-brand.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Script
          id="client-fatal-error-fallback"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getClientFatalErrorFallbackScript() }}
        />
        <PageTransitionRoot />
        {children}
        <DebugRoot page="global" />
      </body>
    </html>
  );
}
