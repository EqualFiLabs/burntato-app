import type { Metadata, Viewport } from "next";

import { DAppProviders } from "@/providers/DAppProviders";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Burntato", template: "%s · Burntato" },
  description: "A fully onchain Hot Potato game on Robinhood Chain Testnet.",
  applicationName: "Burntato",
  openGraph: {
    title: "Burntato",
    description: "Grab it. Hold it. Don’t get burned. Testnet assets only.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Burntato",
    description: "A fully onchain Hot Potato game on Robinhood Chain Testnet.",
  },
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
