"use client";

import * as React from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

  const config = React.useMemo(() => {
    const connectors = [injected()];

    // IMPORTANT: WalletConnect must only be created in the browser (indexedDB)
    if (typeof window !== "undefined") {
      if (!projectId) console.warn("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
      connectors.push(
        walletConnect({
          projectId: projectId || "MISSING_PROJECT_ID",
          showQrModal: true,
        })
      );
    }

    return createConfig({
      chains: [baseSepolia],
      connectors,
      transports: {
        [baseSepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
      },
    });
  }, [projectId]);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}