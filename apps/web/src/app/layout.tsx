import type { Metadata } from "next";
import Script from "next/script";
import "katex/dist/katex.min.css";
import { DebugRoot } from "../debug/DebugRoot";
import { getAppearanceBootstrapScript } from "../shared/appearance/bootstrapScript";
import { AppearanceProvider } from "../shared/appearance/AppearanceProvider";
import { resolveInitialDocumentAppearance } from "../shared/appearance";
import { getRequestAppearancePreference } from "../shared/appearance/request";
import { PageTransitionRoot } from "../shared/components/chrome";
import { getClientFatalErrorFallbackScript } from "../shared/components/product/clientFatalErrorFallback";
import { LocaleProvider } from "../shared/locale/LocaleProvider";
import { getRequestLocale } from "../shared/locale/request";
import "../shared/styles.css";

export const metadata: Metadata = {
  title: "Inquara",
  description: "AI canvas",
  icons: {
    icon: [{ url: "/favicon-brand.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon-brand.svg"]
  }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const appearancePreference = await getRequestAppearancePreference();
  const initialDocumentAppearance = resolveInitialDocumentAppearance(appearancePreference);

  return (
    <html lang={locale} data-appearance={initialDocumentAppearance} suppressHydrationWarning>
      <body>
        <Script
          id="appearance-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getAppearanceBootstrapScript() }}
        />
        <Script
          id="client-fatal-error-fallback"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: getClientFatalErrorFallbackScript() }}
        />
        <PageTransitionRoot />
        <LocaleProvider initialLocale={locale}>
          <AppearanceProvider initialPreference={appearancePreference}>
            {children}
            <DebugRoot page="global" />
          </AppearanceProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
