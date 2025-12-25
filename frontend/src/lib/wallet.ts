"use client";

import { createAppKit } from "@reown/appkit";
import { wagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "wagmi/chains";

let initialized = false;

export function initWallet() {
  if (initialized) return;
  initialized = true;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;
  if (!projectId) {
    console.warn("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
    return;
  }

  createAppKit({
    adapters: [
      wagmiAdapter({
        projectId,
        chains: [baseSepolia],
      }),
    ],
    networks: [baseSepolia],
    projectId,
    metadata: {
      name: "Blockpoint",
      description: "Blockpoint",
      url: typeof window !== "undefined" ? window.location.origin : "https://localhost",
      icons: ["https://walletconnect.com/walletconnect-logo.png"],
    },
  });
}