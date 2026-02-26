import type { ReactNode } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { LiveTicker } from "@/components/live-ticker";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "PraesagiumChain",
  description: "Decentralized Prediction Markets",
};

type RootLayoutProps = Readonly<{ children: ReactNode }>;

export default function RootLayout({ children }: RootLayoutProps) {
  const content = (
    <div className="flex min-h-screen flex-col bg-base">
      <div className="flex flex-col flex-1">
        <Header />
        <LiveTicker />
        <main className="container flex-1 px-4 py-6">
          {/* @ts-expect-error Next.js infiere children como unknown en root layout */}
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="font-body antialiased">
        <Providers>{content}</Providers>
      </body>
    </html>
  );
}
