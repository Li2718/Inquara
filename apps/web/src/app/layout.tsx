import type { Metadata } from "next";
import "../shared/styles.css";

export const metadata: Metadata = {
  title: "Inquara",
  description: "AI canvas workspace"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
