import type { Metadata, Viewport } from "next";

import { DAppProviders } from "@/providers/DAppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: "Burntato",
  description: "A fully onchain Hot Potato game.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050403",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <DAppProviders>{children}</DAppProviders>
      </body>
    </html>
  );
}
