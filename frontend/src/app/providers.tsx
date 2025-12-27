"use client";

import React, { useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initAppKit, wagmiConfig } from "@/lib/wallet";

export default function Providers({ children }: { children: React.ReactNode }) {
  useMemo(() => {
    initAppKit();
    return null;
  }, []);

  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}