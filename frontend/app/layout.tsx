import type { ReactNode } from "react";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MarketWatcherProvider } from "@/components/market-watcher-provider";

const WrongNetworkBanner = dynamic(
  () => import("@/components/wrong-network-banner").then((m) => ({ default: m.WrongNetworkBanner })),
  { ssr: true }
);

const LiveTicker = dynamic(
  () => import("@/components/live-ticker").then((m) => ({ default: m.LiveTicker })),
  { ssr: false }
);

const PWAInstallBanner = dynamic(
  () => import("@/components/pwa-install-banner").then((m) => ({ default: m.PWAInstallBanner })),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "PraesagiumChain",
  description: "Decentralized Prediction Markets",
  manifest: "/manifest.json",
};

type RootLayoutProps = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  const content = (
    <div className="flex min-h-screen flex-col bg-base">
      <div className="flex flex-col flex-1">
        <Header />
        <WrongNetworkBanner />
        <LiveTicker />
        <main className="container flex-1 px-4 py-6 hero-gradient page-enter">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#00D4FF" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          {content}
          <MarketWatcherProvider />
          <PWAInstallBanner />
        </Providers>
      </body>
    </html>
  );
}
