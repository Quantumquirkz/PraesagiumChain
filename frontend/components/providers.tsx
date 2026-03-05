"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ThemeProvider } from "next-themes";
import { CustomToaster } from "@/components/ui/custom-toast";
import { ThemeColorMeta } from "@/components/theme-color-meta";
import { config } from "@/lib/wagmi";
import { useState } from "react";
import { OnboardingModal } from "@/components/onboarding-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <ThemeColorMeta />
          {children}
          <CustomToaster />
          <OnboardingModal />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
