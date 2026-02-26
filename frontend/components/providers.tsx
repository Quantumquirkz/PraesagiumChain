"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ThemeProvider } from "next-themes";
import { CustomToaster } from "@/components/ui/custom-toast";
import { config } from "@/lib/wagmi";
// @ts-expect-error Tipos de @types/react con export= no exponen named exports; en runtime sí existen
import { useState } from "react";
import { OnboardingModal } from "@/components/onboarding-modal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
          <CustomToaster />
          <OnboardingModal />
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
