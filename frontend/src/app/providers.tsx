"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const config = React.useMemo(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

    // IMPORTANT: build connectors only in the browser
    const connectors =
      typeof window === "undefined"
        ? []
        : [
            injected(),
            ...(projectId
              ? [
                  walletConnect({
                    projectId,
                    showQrModal: true,
                  }),
                ]
              : []),
          ];

    return createConfig({
      chains: [baseSepolia],
      connectors,
      transports: {
        [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
      },
      // This prevents SSR issues with WalletConnect (indexedDB, etc.)
      ssr: false,
    });
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}