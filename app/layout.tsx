import type { Metadata, Viewport } from "next";

import { BURNTATO_DEPLOYMENT } from "@/lib/burntato/contract";
import { publicSiteUrl } from "@/lib/burntato/sponsorship";
import { DAppProviders } from "@/providers/DAppProviders";

import "./globals.css";

const metadataBase = publicSiteUrl(process.env.NEXT_PUBLIC_BURNTATO_SITE_URL) ?? undefined;

export const metadata: Metadata = {
  metadataBase,
  title: { default: "Burntato", template: "%s · Burntato" },
  description: `A fully onchain Hot Potato game on ${BURNTATO_DEPLOYMENT.network}.`,
  applicationName: "Burntato",
  openGraph: {
    title: "Burntato",
    description: `Grab it. Hold it. Don’t get burned. ${BURNTATO_DEPLOYMENT.network}.`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Burntato",
    description: `A fully onchain Hot Potato game on ${BURNTATO_DEPLOYMENT.network}.`,
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
