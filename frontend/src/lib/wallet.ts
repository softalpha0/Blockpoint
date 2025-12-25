"use client";

import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { baseSepolia } from "wagmi/chains";

let initialized = false;

export function initWallet() {
  if (initialized) return;
  initialized = true;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  if (!projectId) {
    // Don't crash builds if env isn't set locally
    console.warn("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
    return;
  }

  // Create the adapter instance (this replaces `wagmiAdapter`)
  const wagmiAdapter = new WagmiAdapter({
    projectId,
    networks: [baseSepolia],
  });

  createAppKit({
    projectId,
    networks: [baseSepolia],
    adapters: [wagmiAdapter],
  });
}