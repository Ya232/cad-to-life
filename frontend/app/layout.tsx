import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CAD-to-Life",
  description: "Parametric design assistant for printable parts",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
