import type { Metadata } from "next";
import { DebugRoot } from "../debug/DebugRoot";
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
        {children}
        <DebugRoot page="global" />
      </body>
    </html>
  );
}
