import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FLASHCUT",
  description: "See it. Gone. Guess it.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
